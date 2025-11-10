const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // Başlangıç bakiyesi
  initialBalance: {
    type: Number,
    default: 0
  },
  // Mevcut bakiye
  balance: {
    type: Number,
    default: 0
  },
  description: String,
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
  isActive: {
    type: Boolean,
    default: true
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

cashRegisterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CashRegister', cashRegisterSchema);
