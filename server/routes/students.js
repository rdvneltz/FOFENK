const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');

// Get all students with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId, includeArchived, includeDiscountInfo } = req.query;

    // Season filter is required
    if (!seasonId) {
      return res.status(400).json({ message: 'Season parameter is required' });
    }

    const filter = { season: seasonId };
    if (institutionId) filter.institution = institutionId;

    // By default, exclude archived students unless includeArchived=true
    if (includeArchived !== 'true') {
      filter.isArchived = { $ne: true };
    }

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    // If discount info is requested, fetch enrollments with discount info
    if (includeDiscountInfo === 'true') {
      const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
      const studentIds = students.map(s => s._id);

      const enrollments = await StudentCourseEnrollment.find({
        student: { $in: studentIds },
        season: seasonId,
        isActive: true
      })
        .populate('course', 'name')
        .lean();

      // Group enrollments by student and find the best discount
      const studentDiscounts = {};
      enrollments.forEach(enrollment => {
        const studentId = enrollment.student.toString();
        if (!studentDiscounts[studentId]) {
          studentDiscounts[studentId] = {
            discounts: [],
            courses: []
          };
        }

        studentDiscounts[studentId].courses.push(enrollment.course?.name || 'Ders');

        if (enrollment.discount && enrollment.discount.type !== 'none') {
          studentDiscounts[studentId].discounts.push({
            type: enrollment.discount.type,
            value: enrollment.discount.value,
            description: enrollment.discount.description,
            courseName: enrollment.course?.name
          });
        }
      });

      // Add discount info to students
      students.forEach(student => {
        const discountInfo = studentDiscounts[student._id.toString()];
        if (discountInfo) {
          student.enrolledCourses = discountInfo.courses;
          student.discounts = discountInfo.discounts;
          // Set primary discount (fullScholarship takes priority, then highest percentage)
          if (discountInfo.discounts.length > 0) {
            const fullScholarship = discountInfo.discounts.find(d => d.type === 'fullScholarship');
            if (fullScholarship) {
              student.primaryDiscount = fullScholarship;
            } else {
              // Find the highest discount
              const sortedDiscounts = discountInfo.discounts.sort((a, b) => {
                if (a.type === 'percentage' && b.type === 'percentage') {
                  return b.value - a.value;
                }
                return 0;
              });
              student.primaryDiscount = sortedDiscounts[0];
            }
          }
        }
      });
    }

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create student
router.post('/', async (req, res) => {
  try {
    const student = new Student(req.body);
    const newStudent = await student.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Student',
      entityId: newStudent._id,
      description: `Yeni öğrenci oluşturuldu: ${newStudent.firstName} ${newStudent.lastName}`,
      institution: newStudent.institution,
      season: newStudent.season
    });

    const populatedStudent = await Student.findById(newStudent._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    res.status(201).json(populatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate');

    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci güncellendi: ${student.firstName} ${student.lastName}`,
      institution: student.institution._id,
      season: student.season._id
    });

    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete student
// Check student related transactions before deletion
router.get('/:id/check-related-records', async (req, res) => {
  try {
    const studentId = req.params.id;
    const Payment = require('../models/Payment');
    const Expense = require('../models/Expense');

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Find all payments related to this student
    const payments = await Payment.find({ student: studentId })
      .populate('course', 'name')
      .populate('cashRegister', 'name')
      .sort({ paymentDate: -1 });

    // Find all expenses that might be related (auto-generated expenses like VAT, commission)
    const relatedExpenses = await Expense.find({
      $or: [
        { relatedStudent: studentId },
        { description: { $regex: `${student.firstName}.*${student.lastName}|${student.lastName}.*${student.firstName}`, $options: 'i' } }
      ]
    })
      .populate('cashRegister', 'name')
      .sort({ expenseDate: -1 });

    // Calculate totals
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpense = relatedExpenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        balance: student.balance
      },
      payments: payments.map(p => ({
        _id: p._id,
        amount: p.amount,
        date: p.paymentDate,
        course: p.course?.name || '-',
        paymentType: p.paymentType,
        cashRegister: p.cashRegister?.name || '-',
        isInvoiced: p.isInvoiced,
        isRefunded: p.isRefunded
      })),
      expenses: relatedExpenses.map(e => ({
        _id: e._id,
        amount: e.amount,
        date: e.expenseDate,
        category: e.category,
        description: e.description,
        cashRegister: e.cashRegister?.name || '-',
        isAutoGenerated: e.isAutoGenerated
      })),
      totals: {
        totalIncome,
        totalExpense,
        paymentCount: payments.length,
        expenseCount: relatedExpenses.length
      }
    });
  } catch (error) {
    console.error('Error checking related records:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const Expense = require('../models/Expense');
    const PaymentPlan = require('../models/PaymentPlan');
    const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
    const CashRegister = require('../models/CashRegister');

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Delete related records and revert cash register balances
    // 1. Get all payments and revert their effects before deleting
    const payments = await Payment.find({ student: req.params.id });
    for (const payment of payments) {
      // Revert cash register balance (subtract payment amount)
      if (payment.cashRegister) {
        await CashRegister.findByIdAndUpdate(payment.cashRegister, {
          $inc: { balance: -payment.amount }
        });
      }
    }
    await Payment.deleteMany({ student: req.params.id });

    // 2. Get all related expenses and revert their effects before deleting
    const relatedExpenses = await Expense.find({
      $or: [
        { relatedStudent: req.params.id },
        { description: { $regex: `${student.firstName}.*${student.lastName}|${student.lastName}.*${student.firstName}`, $options: 'i' } }
      ]
    });
    for (const expense of relatedExpenses) {
      // Revert cash register balance (add back expense amount)
      if (expense.cashRegister) {
        await CashRegister.findByIdAndUpdate(expense.cashRegister, {
          $inc: { balance: expense.amount }
        });
      }
    }
    await Expense.deleteMany({
      $or: [
        { relatedStudent: req.params.id },
        { description: { $regex: `${student.firstName}.*${student.lastName}|${student.lastName}.*${student.firstName}`, $options: 'i' } }
      ]
    });

    // 3. Delete payment plans
    await PaymentPlan.deleteMany({ student: req.params.id });

    // 4. Delete enrollments
    await StudentCourseEnrollment.deleteMany({ student: req.params.id });

    // 5. Finally delete the student
    await Student.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci ve ilgili tüm kayıtlar silindi: ${student.firstName} ${student.lastName}`,
      institution: student.institution,
      season: student.season
    });

    res.json({
      message: 'Öğrenci ve ilgili tüm kayıtlar başarıyla silindi',
      deleted: {
        student: student.firstName + ' ' + student.lastName
      }
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: error.message });
  }
});

// Archive student
router.post('/:id/archive', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    student.isArchived = true;
    student.archivedDate = new Date();
    student.archiveReason = req.body.reason || '';
    student.updatedBy = req.body.archivedBy || 'user';
    await student.save();

    await ActivityLog.create({
      user: req.body.archivedBy || 'System',
      action: 'archive',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci arşivlendi: ${student.firstName} ${student.lastName}${req.body.reason ? ` - Sebep: ${req.body.reason}` : ''}`,
      institution: student.institution,
      season: student.season
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unarchive student
router.post('/:id/unarchive', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    student.isArchived = false;
    student.archivedDate = null;
    student.archiveReason = null;
    student.updatedBy = req.body.unarchivedBy || 'user';
    await student.save();

    await ActivityLog.create({
      user: req.body.unarchivedBy || 'System',
      action: 'unarchive',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci arşivden çıkarıldı: ${student.firstName} ${student.lastName}`,
      institution: student.institution,
      season: student.season
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get archived students only
router.get('/archived/list', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;

    if (!seasonId) {
      return res.status(400).json({ message: 'Season parameter is required' });
    }

    const filter = {
      season: seasonId,
      isArchived: true
    };
    if (institutionId) filter.institution = institutionId;

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ archivedDate: -1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
