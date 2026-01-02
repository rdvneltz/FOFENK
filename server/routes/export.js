const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const PaymentPlan = require('../models/PaymentPlan');
const Instructor = require('../models/Instructor');
const Course = require('../models/Course');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const CashRegister = require('../models/CashRegister');
const ScheduledLesson = require('../models/ScheduledLesson');
const Attendance = require('../models/Attendance');
const TrialLesson = require('../models/TrialLesson');
const RecurringExpense = require('../models/RecurringExpense');
const Institution = require('../models/Institution');
const Season = require('../models/Season');
const {
  exportStudentsToExcel,
  exportPaymentsToExcel,
  exportExpensesToExcel,
  exportReportToExcel,
  createComprehensiveBackup
} = require('../utils/excelExporter');

// Export students to Excel
router.get('/students', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ lastName: 1, firstName: 1 });

    const workbook = await exportStudentsToExcel(students);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ogrenciler-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export payments to Excel
router.get('/payments', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName')
      .populate('institution', 'name')
      .populate('season', 'name')
      .sort({ date: -1 });

    const workbook = await exportPaymentsToExcel(payments);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=odemeler-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export expenses to Excel
router.get('/expenses', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name')
      .sort({ date: -1 });

    const workbook = await exportExpensesToExcel(expenses);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=giderler-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export report to Excel
router.get('/report', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Fetch payments and expenses
    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName')
      .populate('institution', 'name')
      .sort({ date: -1 });

    const expenses = await Expense.find(filter)
      .populate('institution', 'name')
      .sort({ date: -1 });

    // Calculate summary
    const totalIncome = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalExpenses = expenses
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const netProfit = totalIncome - totalExpenses;

    const reportData = {
      title: 'Finansal Rapor',
      startDate: startDate || new Date(0),
      endDate: endDate || new Date(),
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        pendingPayments
      },
      payments,
      expenses
    };

    const workbook = await exportReportToExcel(reportData);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=rapor-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Comprehensive backup - ALL data in one Excel file
router.get('/full-backup', async (req, res) => {
  try {
    console.log('Starting comprehensive backup export...');
    const startTime = Date.now();

    // Fetch all data in parallel for performance
    const [
      students,
      instructors,
      courses,
      enrollments,
      paymentPlans,
      payments,
      expenses,
      cashRegisters,
      scheduledLessons,
      attendances,
      trialLessons,
      recurringExpenses,
      institutions,
      seasons
    ] = await Promise.all([
      // Students with populated references
      Student.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ lastName: 1, firstName: 1 })
        .lean(),

      // Instructors
      Instructor.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ lastName: 1, firstName: 1 })
        .lean(),

      // Courses
      Course.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .populate('instructor', 'firstName lastName')
        .sort({ name: 1 })
        .lean(),

      // Enrollments
      StudentCourseEnrollment.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ enrollmentDate: -1 })
        .lean(),

      // Payment Plans with installments
      PaymentPlan.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ createdAt: -1 })
        .lean(),

      // Payments
      Payment.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('cashRegister', 'name')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ paymentDate: -1 })
        .lean(),

      // Expenses
      Expense.find()
        .populate('cashRegister', 'name')
        .populate('instructor', 'firstName lastName')
        .populate('recurringExpense', 'title')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ expenseDate: -1 })
        .lean(),

      // Cash Registers
      CashRegister.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ name: 1 })
        .lean(),

      // Scheduled Lessons
      ScheduledLesson.find()
        .populate('course', 'name')
        .populate('student', 'firstName lastName')
        .populate('instructor', 'firstName lastName')
        .populate('additionalInstructors.instructor', 'firstName lastName')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ date: -1 })
        .lean(),

      // Attendance - with nested population
      Attendance.find()
        .populate('student', 'firstName lastName')
        .populate({
          path: 'scheduledLesson',
          populate: [
            { path: 'course', select: 'name' }
          ]
        })
        .sort({ createdAt: -1 })
        .lean(),

      // Trial Lessons
      TrialLesson.find()
        .populate('course', 'name')
        .populate('instructor', 'firstName lastName')
        .populate('student', 'firstName lastName')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ scheduledDate: -1 })
        .lean(),

      // Recurring Expenses
      RecurringExpense.find()
        .populate('defaultCashRegister', 'name')
        .populate('instructor', 'firstName lastName')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ title: 1 })
        .lean(),

      // Institutions
      Institution.find().sort({ name: 1 }).lean(),

      // Seasons
      Season.find()
        .populate('institution', 'name')
        .sort({ startDate: -1 })
        .lean()
    ]);

    console.log(`Data fetched in ${Date.now() - startTime}ms`);
    console.log(`Students: ${students.length}, Payments: ${payments.length}, Expenses: ${expenses.length}`);

    // Create the comprehensive backup workbook
    const workbook = await createComprehensiveBackup({
      students,
      instructors,
      courses,
      enrollments,
      paymentPlans,
      payments,
      expenses,
      cashRegisters,
      scheduledLessons,
      attendances,
      trialLessons,
      recurringExpenses,
      institutions,
      seasons
    });

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `FOFORA-Yedek-${dateStr}_${timeStr}.xlsx`;

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // Write to response
    await workbook.xlsx.write(res);

    console.log(`Backup export completed in ${Date.now() - startTime}ms`);
    res.end();
  } catch (error) {
    console.error('Full backup export error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
