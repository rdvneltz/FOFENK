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
  // Haftada kaç gün (aylık ücretlendirme için)
  weeklyFrequency: {
    type: Number,
    min: 1,
    max: 7,
    default: 1
  },
  // Ücretsiz mi (deneme dersi vb.)
  isFree: {
    type: Boolean,
    default: false
  },
  // Eğitmen
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  },
  // Kapasite (maksimum öğrenci sayısı)
  capacity: {
    type: Number,
    default: 0
  },
  // Ders süresi (dakika)
  duration: {
    type: Number,
    default: 60
  },
  // Program (Örn: "Pazartesi 10:00")
  schedule: String,
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

  // Auto-calculate pricePerLesson if monthly pricing
  if (this.pricingType === 'monthly' && this.pricePerMonth && this.weeklyFrequency) {
    // Assume 4 weeks per month
    this.pricePerLesson = this.pricePerMonth / (4 * this.weeklyFrequency);
  }

  // Auto-calculate pricePerMonth if per-lesson pricing
  if (this.pricingType === 'perLesson' && this.pricePerLesson && this.weeklyFrequency) {
    this.pricePerMonth = this.pricePerLesson * 4 * this.weeklyFrequency;
  }

  next();
});

module.exports = mongoose.model('Course', courseSchema);
