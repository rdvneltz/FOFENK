const mongoose = require('mongoose');

// Additional instructor schema for multiple instructors per lesson
const additionalInstructorSchema = new mongoose.Schema({
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  paymentCalculated: {
    type: Boolean,
    default: false
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentPaid: {
    type: Boolean,
    default: false
  },
  paymentDate: Date
}, { _id: true });

const scheduledLessonSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // Student for one-on-one (birebir) lessons - null for group lessons
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  // Primary instructor
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  },
  // Additional instructors (optional, up to 2 more)
  additionalInstructors: [additionalInstructorSchema],
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
  // Erteleme bilgileri - orijinal tarih ve saat
  originalDate: Date,
  originalStartTime: String,
  originalEndTime: String,
  // Erteleme nedeni
  postponeReason: String,
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
  // Eğitmen ücreti ödendi mi
  instructorPaymentPaid: {
    type: Boolean,
    default: false
  },
  // Ödeme tarihi
  instructorPaymentDate: Date,
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
