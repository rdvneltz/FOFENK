const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: String,
  phone: String,
  email: String,
  taxNumber: String,
  taxOffice: String,
  website: String,
  logo: String, // path to uploaded logo
  letterhead: String, // path to uploaded letterhead
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  updatedBy: String,
  // Varsayılan kasalar
  defaultIncomeCashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashRegister',
    default: null
  },
  defaultExpenseCashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashRegister',
    default: null
  }
});

institutionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Institution', institutionSchema);
