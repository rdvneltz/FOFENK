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
      'payment',
      'expense',
      'enrollment',
      'attendance'
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
      'Instructor',
      'Payment',
      'Expense',
      'CashRegister',
      'ScheduledLesson',
      'Attendance',
      'PaymentPlan',
      'TrialLesson',
      'Settings'
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
    ref: 'Institution',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
