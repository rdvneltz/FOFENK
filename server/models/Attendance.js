const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  scheduledLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduledLesson',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  // Katıldı mı
  attended: {
    type: Boolean,
    default: false
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  updatedBy: String
});

attendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Bir derste bir öğrenci için sadece bir yoklama kaydı olmalı
attendanceSchema.index({ scheduledLesson: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
