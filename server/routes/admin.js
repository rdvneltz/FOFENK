const express = require('express');
const router = express.Router();

// Import all models
const User = require('../models/User');
const Institution = require('../models/Institution');
const Season = require('../models/Season');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Instructor = require('../models/Instructor');
const ScheduledLesson = require('../models/ScheduledLesson');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const PaymentPlan = require('../models/PaymentPlan');
const Expense = require('../models/Expense');
const PlannedExpense = require('../models/PlannedExpense');
const CashRegister = require('../models/CashRegister');
const TrialLesson = require('../models/TrialLesson');
const MessageTemplate = require('../models/MessageTemplate');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');

// DANGER: Reset database (DELETE ALL DATA)
// Only accessible with special token
router.post('/reset-database', async (req, res) => {
  try {
    // Simple protection: require a secret token
    const { token } = req.body;

    // Secret token (change this!)
    if (token !== 'RESET_FOFORA_2025') {
      return res.status(403).json({ message: 'Invalid token' });
    }

    // Delete all collections
    await Promise.all([
      User.deleteMany({}),
      Institution.deleteMany({}),
      Season.deleteMany({}),
      Student.deleteMany({}),
      Course.deleteMany({}),
      Instructor.deleteMany({}),
      ScheduledLesson.deleteMany({}),
      StudentCourseEnrollment.deleteMany({}),
      Attendance.deleteMany({}),
      Payment.deleteMany({}),
      PaymentPlan.deleteMany({}),
      Expense.deleteMany({}),
      PlannedExpense.deleteMany({}),
      CashRegister.deleteMany({}),
      TrialLesson.deleteMany({}),
      MessageTemplate.deleteMany({}),
      Settings.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    // Count remaining documents
    const counts = {
      users: await User.countDocuments(),
      institutions: await Institution.countDocuments(),
      seasons: await Season.countDocuments(),
      students: await Student.countDocuments(),
      courses: await Course.countDocuments(),
      instructors: await Instructor.countDocuments(),
      scheduledLessons: await ScheduledLesson.countDocuments(),
      enrollments: await StudentCourseEnrollment.countDocuments(),
      attendance: await Attendance.countDocuments(),
      payments: await Payment.countDocuments(),
      paymentPlans: await PaymentPlan.countDocuments(),
      expenses: await Expense.countDocuments(),
      plannedExpenses: await PlannedExpense.countDocuments(),
      cashRegisters: await CashRegister.countDocuments(),
      trialLessons: await TrialLesson.countDocuments(),
      messageTemplates: await MessageTemplate.countDocuments(),
      settings: await Settings.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
    };

    res.json({
      message: 'Database reset successfully',
      counts: counts,
      note: 'All data has been deleted. You can now use /setup to initialize the system.'
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
