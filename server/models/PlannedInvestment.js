const mongoose = require('mongoose');

const plannedInvestmentSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  estimatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['equipment', 'furniture', 'renovation', 'event', 'marketing', 'education', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['planned', 'approved', 'in_progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  actualAmount: {
    type: Number,
    min: 0
  },
  completedDate: {
    type: Date
  },
  notes: {
    type: String
  },
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
plannedInvestmentSchema.index({ institution: 1, status: 1 });

module.exports = mongoose.model('PlannedInvestment', plannedInvestmentSchema);
