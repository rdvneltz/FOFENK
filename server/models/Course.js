const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
  // Ücretlendirme tipi: 'perLesson' (ders başı) veya 'monthly' (aylık)
  pricingType: {
    type: String,
    enum: ['perLesson', 'monthly'],
    required: true
  },
  // Ders başı ücret (pricingType: perLesson ise)
  pricePerLesson: {
    type: Number,
    default: 0
  },
  // Aylık ücret (pricingType: monthly ise)
  pricePerMonth: {
    type: Number,
    default: 0
  },
  // Ücretsiz mi (deneme dersi vb.)
  isFree: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#1976d2' // Material-UI primary color
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

courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
