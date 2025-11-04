const mongoose = require('mongoose');

// Planlanan giderler
const plannedExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  estimatedAmount: {
    type: Number,
    required: true
  },
  plannedDate: Date,
  category: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['planned', 'approved', 'completed', 'cancelled'],
    default: 'planned'
  },
  // Gerçekleştirildiğinde oluşan expense kaydı
  actualExpense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
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

plannedExpenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PlannedExpense', plannedExpenseSchema);
