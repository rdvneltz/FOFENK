const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  relationship: {
    type: String,
    enum: ['Anne', 'Baba', 'Vasi', 'Diğer']
  }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  dateOfBirth: Date,
  tcNo: String,
  address: String,
  email: String,
  phone: String,
  emergencyContact: contactSchema,
  parentContacts: [contactSchema],
  healthNotes: String,
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
  // Öğrenci toplam borç/alacak bakiyesi
  balance: {
    type: Number,
    default: 0
  },
  // Öğrenci durumu: deneme, kayıtlı, pasif
  status: {
    type: String,
    enum: ['trial', 'active', 'passive'],
    default: 'trial'
  },
  // Arşivlenmiş mi
  isArchived: {
    type: Boolean,
    default: false
  },
  // Arşivlenme tarihi
  archivedDate: Date,
  // Arşivlenme sebebi
  archiveReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Varsayılan bildirim alıcısı: student, mother, father
  defaultNotificationRecipient: {
    type: String,
    enum: ['student', 'mother', 'father'],
    default: 'student'
  },
  createdBy: String,
  updatedBy: String
});

studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema);
