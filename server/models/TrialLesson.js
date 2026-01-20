const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  relationship: {
    type: String,
    enum: ['Anne', 'Baba', 'Vasi', 'Diğer']
  }
}, { _id: false });

// Deneme/Tanışma dersi kayıtları
const trialLessonSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  dateOfBirth: Date,
  phone: String,
  email: String,
  parentContacts: [contactSchema],
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // Deneme dersi eğitmeni
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  },
  // Deneme dersi tarihi ve saati
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: {
    type: String,
    required: true
  },
  // Ders süresi (dakika)
  duration: {
    type: Number,
    default: 60
  },
  // Durum: bekliyor, tamamlandı, iptal, kayıt oldu, ertelendi
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'converted', 'postponed'],
    default: 'pending'
  },
  // Erteleme bilgileri - orijinal tarih ve saat
  originalScheduledDate: Date,
  originalScheduledTime: String,
  // Erteleme nedeni
  postponeReason: String,
  // Deneme dersine katıldı mı
  attended: {
    type: Boolean,
    default: false
  },
  // Kesin kayıt yaptırıldı mı
  convertedToStudent: {
    type: Boolean,
    default: false
  },
  // Kesin kayıt yapıldıysa öğrenci ID
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  // Kayıt yapıldıysa enrollment ID
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentCourseEnrollment'
  },
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
  // Ders öncesi notlar
  notes: String,
  // Ders sonrası geri bildirim/notlar
  feedbackNotes: String,
  // Kayıt olmak istiyor mu?
  interestedInEnrollment: {
    type: Boolean,
    default: null
  },
  // Bizi nasıl duydunuz?
  referralSource: {
    type: String,
    enum: ['instagram', 'facebook', 'google', 'friend', 'flyer', 'other', ''],
    default: ''
  },
  referralDetails: String,
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

trialLessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TrialLesson', trialLessonSchema);
