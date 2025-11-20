const mongoose = require('mongoose');

// Kullanıcı aktivite log kayıtları
const activityLogSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'update',
      'delete',
      'archive',
      'unarchive',
      'payment',
      'expense',
      'enrollment',
      'attendance',
      'setup',
      'login',
      'logout',
      'reset'
    ]
  },
  entity: {
    type: String,
    required: true,
    enum: [
      'Institution',
      'Season',
      'Student',
      'Course',
      'StudentCourseEnrollment',
      'Instructor',
      'Payment',
      'Expense',
      'CashRegister',
      'ScheduledLesson',
      'Attendance',
      'PaymentPlan',
      'TrialLesson',
      'Settings',
      'System',
      'User',
      'Database'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String,
    required: true
  },
  metadata: mongoose.Schema.Types.Mixed,
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
