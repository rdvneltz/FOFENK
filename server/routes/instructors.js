const express = require('express');
const router = express.Router();
const Instructor = require('../models/Instructor');
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
    const ScheduledLesson = require('../models/ScheduledLesson');

    const instructor = await Instructor.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name');

    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    // Get all instructor payments (expenses with category "Eğitmen Ödemesi")
    const payments = await Expense.find({
      instructor: req.params.id,
      category: 'Eğitmen Ödemesi'
    })
      .populate('cashRegister', 'name')
      .sort({ expenseDate: -1 });

    // Get total completed lessons
    const completedLessons = await ScheduledLesson.countDocuments({
      instructor: req.params.id,
      status: 'completed'
    });

    // Calculate total paid
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

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
      statistics: {
        totalPaid,
        balance: instructor.balance,
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
