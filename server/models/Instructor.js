const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  phone: String,
  email: String,
  tcNo: String,
  address: String,
  // Ödeme tipi: 'monthly' (aylık maaş), 'perLesson' (ders başı), 'hourly' (saat başı), 'perStudent' (öğrenci sayısı üzerinden)
  paymentType: {
    type: String,
    enum: ['monthly', 'perLesson', 'hourly', 'perStudent'],
    required: true
  },
  // Ödeme miktarı
  paymentAmount: {
    type: Number,
    required: true
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
  // Eğitmene borç bakiyesi
  balance: {
    type: Number,
    default: 0
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

instructorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Instructor', instructorSchema);
