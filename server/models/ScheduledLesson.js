const mongoose = require('mongoose');

const scheduledLessonSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "HH:mm"
    required: true
  },
  endTime: {
    type: String, // Format: "HH:mm"
    required: true
  },
  // Ders tamamlandı mı
  isCompleted: {
    type: Boolean,
    default: false
  },
  // İptal/erteleme durumu
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  // Eğitmen dersi onayladı mı (derse girdi mi)
  instructorConfirmed: {
    type: Boolean,
    default: false
  },
  // Dersin gerçekte kaç saat sürdüğü (planlanan ile farklı olabilir)
  actualDuration: {
    type: Number, // Saat cinsinden (örn: 2.5 saat)
    default: null
  },
  // Eğitmen ücreti bu ders için hesaplandı mı
  instructorPaymentCalculated: {
    type: Boolean,
    default: false
  },
  // Bu ders için eğitmene yansıtılan ücret
  instructorPaymentAmount: Number,
  notes: String,
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
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

scheduledLessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ScheduledLesson', scheduledLessonSchema);
