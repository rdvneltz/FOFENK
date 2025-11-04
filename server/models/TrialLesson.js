const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  relationship: String
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
  scheduledLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduledLesson'
  },
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

trialLessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TrialLesson', trialLessonSchema);
