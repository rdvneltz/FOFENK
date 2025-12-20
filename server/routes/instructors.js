const express = require('express');
const router = express.Router();
const Instructor = require('../models/Instructor');
const SalaryAccrual = require('../models/SalaryAccrual');
const ActivityLog = require('../models/ActivityLog');

// Get all instructors with filtering
router.get('/', async (req, res) => {
  try {
    const { institution, institutionId, season, seasonId } = req.query;
    const filter = {};

    // Support both 'institution' and 'institutionId' parameter names
    if (institution) filter.institution = institution;
    if (institutionId) filter.institution = institutionId;

    // Support both 'season' and 'seasonId' parameter names
    if (season) filter.season = season;
    if (seasonId) filter.season = seasonId;

    const instructors = await Instructor.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name')
      .sort({ lastName: 1, firstName: 1 });

    res.json(instructors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get instructor by ID
router.get('/:id', async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name');

    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }
    res.json(instructor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get instructor details with payments
router.get('/:id/details', async (req, res) => {
  try {
    const Expense = require('../models/Expense');
    const RecurringExpense = require('../models/RecurringExpense');
    const ScheduledLesson = require('../models/ScheduledLesson');

    const instructor = await Instructor.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name');

    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    // Get only PAID instructor payments for payment history
    const payments = await Expense.find({
      instructor: req.params.id,
      category: 'Eğitmen Ödemesi',
      status: 'paid'
    })
      .populate('cashRegister', 'name')
      .sort({ expenseDate: -1 });

    // Get UNPAID expenses for balance calculation
    const unpaidExpenses = await Expense.find({
      instructor: req.params.id,
      category: 'Eğitmen Ödemesi',
      status: { $in: ['pending', 'overdue'] }
    });

    // Get recurring expense (salary template) for this instructor
    const salaryRecurring = await RecurringExpense.findOne({
      instructor: req.params.id,
      category: 'Eğitmen Ödemesi'
    });

    // Get salary accruals for monthly instructors
    const salaryAccruals = await SalaryAccrual.find({
      instructor: req.params.id
    }).sort({ year: -1, month: -1 });

    // Get total completed lessons
    const completedLessons = await ScheduledLesson.countDocuments({
      instructor: req.params.id,
      status: 'completed'
    });

    // Calculate total paid (only from paid expenses)
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate balance from unpaid expenses (negative = we owe them money)
    const unpaidBalance = unpaidExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const calculatedBalance = -unpaidBalance; // Negative because we owe them

    // Calculate total accrued (for monthly instructors)
    const totalAccrued = salaryAccruals.reduce((sum, accrual) => sum + accrual.amount, 0);

    // Calculate expected payment based on payment type
    let expectedPayment = 0;
    if (instructor.paymentType === 'perLesson') {
      expectedPayment = completedLessons * instructor.paymentAmount;
    } else if (instructor.paymentType === 'monthly') {
      // For monthly, we can't auto-calculate without knowing the period
      // User needs to manually create the payment
      expectedPayment = instructor.paymentAmount;
    }

    res.json({
      instructor,
      payments,
      salaryAccruals,
      salaryExpenses: {
        recurring: salaryRecurring,
        unpaid: unpaidExpenses
      },
      statistics: {
        totalPaid,
        totalAccrued,
        balance: calculatedBalance,
        unpaidCount: unpaidExpenses.length,
        completedLessons,
        expectedPayment: instructor.paymentType === 'perLesson' ? expectedPayment : null,
        paymentType: instructor.paymentType,
        paymentAmount: instructor.paymentAmount
      }
    });
  } catch (error) {
    console.error('Error fetching instructor details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create salary accrual for monthly instructor
router.post('/:id/accrue-salary', async (req, res) => {
  try {
    const { month, year, description } = req.body;

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    // Check if instructor is monthly paid
    if (instructor.paymentType !== 'monthly') {
      return res.status(400).json({
        message: 'Bu eğitmen aylık maaşlı değil. Maaş tahakkuku sadece aylık maaşlı eğitmenler için yapılabilir.'
      });
    }

    // Check if accrual already exists for this month
    const existingAccrual = await SalaryAccrual.findOne({
      instructor: req.params.id,
      month,
      year
    });

    if (existingAccrual) {
      const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      return res.status(400).json({
        message: `${monthNames[month]} ${year} için zaten maaş tahakkuku yapılmış.`
      });
    }

    // Create the accrual
    const accrual = new SalaryAccrual({
      instructor: req.params.id,
      month,
      year,
      amount: instructor.paymentAmount,
      description: description || `${month}/${year} Aylık Maaş`,
      institution: instructor.institution,
      season: instructor.season,
      createdBy: req.body.createdBy || 'System'
    });

    await accrual.save();

    // Update instructor balance (add to debt - we owe them money)
    await Instructor.findByIdAndUpdate(req.params.id, {
      $inc: { balance: instructor.paymentAmount }
    });

    // Log activity
    const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'SalaryAccrual',
      entityId: accrual._id,
      description: `${instructor.firstName} ${instructor.lastName} için ${monthNames[month]} ${year} maaş tahakkuku: ₺${instructor.paymentAmount}`,
      institution: instructor.institution
    });

    res.status(201).json({
      message: `${monthNames[month]} ${year} maaş tahakkuku başarıyla oluşturuldu.`,
      accrual,
      newBalance: instructor.balance + instructor.paymentAmount
    });
  } catch (error) {
    console.error('Error creating salary accrual:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bu ay için zaten tahakkuk yapılmış.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete salary accrual
router.delete('/:id/accruals/:accrualId', async (req, res) => {
  try {
    const accrual = await SalaryAccrual.findById(req.params.accrualId);
    if (!accrual) {
      return res.status(404).json({ message: 'Tahakkuk bulunamadı' });
    }

    // Check if accrual belongs to this instructor
    if (accrual.instructor.toString() !== req.params.id) {
      return res.status(400).json({ message: 'Bu tahakkuk bu eğitmene ait değil' });
    }

    // Reverse the balance change
    await Instructor.findByIdAndUpdate(req.params.id, {
      $inc: { balance: -accrual.amount }
    });

    await SalaryAccrual.findByIdAndDelete(req.params.accrualId);

    // Log activity
    const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'SalaryAccrual',
      entityId: accrual._id,
      description: `Maaş tahakkuku silindi: ${monthNames[accrual.month]} ${accrual.year} - ₺${accrual.amount}`,
      institution: accrual.institution
    });

    res.json({ message: 'Tahakkuk silindi' });
  } catch (error) {
    console.error('Error deleting salary accrual:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create instructor
router.post('/', async (req, res) => {
  try {
    const instructor = new Instructor(req.body);
    const newInstructor = await instructor.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Instructor',
      entityId: newInstructor._id,
      description: `Yeni eğitmen oluşturuldu: ${newInstructor.firstName} ${newInstructor.lastName}`,
      institution: newInstructor.institution
    });

    const populatedInstructor = await Instructor.findById(newInstructor._id)
      .populate('institution', 'name');

    res.status(201).json(populatedInstructor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update instructor
router.put('/:id', async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Instructor',
      entityId: instructor._id,
      description: `Eğitmen güncellendi: ${instructor.firstName} ${instructor.lastName}`,
      institution: instructor.institution._id
    });

    res.json(instructor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete instructor
router.delete('/:id', async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    await Instructor.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Instructor',
      entityId: instructor._id,
      description: `Eğitmen silindi: ${instructor.firstName} ${instructor.lastName}`,
      institution: instructor.institution
    });

    res.json({ message: 'Eğitmen silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
