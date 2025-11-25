const mongoose = require('mongoose');

const salaryAccrualSchema = new mongoose.Schema({
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true
  },
  // Ay (1-12)
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // Yıl
  year: {
    type: Number,
    required: true
  },
  // Tahakkuk tutarı
  amount: {
    type: Number,
    required: true
  },
  // Açıklama
  description: {
    type: String,
    default: ''
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String
});

// Aynı ay için tekrar tahakkuk yapılmasını engelle
salaryAccrualSchema.index({ instructor: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('SalaryAccrual', salaryAccrualSchema);
