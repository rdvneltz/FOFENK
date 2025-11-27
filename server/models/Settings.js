const mongoose = require('mongoose');

const creditCardRatesSchema = new mongoose.Schema({
  installments: {
    type: Number,
    required: true
  },
  rate: {
    type: Number,
    required: true
  }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true,
    unique: true
  },
  // KDV oranı (varsayılan %10)
  vatRate: {
    type: Number,
    default: 10
  },
  // Kredi kartı komisyon oranları
  creditCardRates: {
    type: [creditCardRatesSchema],
    default: [
      { installments: 1, rate: 4 },
      { installments: 2, rate: 6.5 },
      { installments: 3, rate: 9 },
      { installments: 4, rate: 11.5 },
      { installments: 5, rate: 14 },
      { installments: 6, rate: 16.5 },
      { installments: 7, rate: 19 },
      { installments: 8, rate: 24.51 },
      { installments: 9, rate: 21.5 },
      { installments: 10, rate: 24 },
      { installments: 11, rate: 26.5 },
      { installments: 12, rate: 29 }
    ]
  },
  // Resmi tatiller (Türkiye için varsayılanlar)
  publicHolidays: {
    type: [Date],
    default: []
  },
  // Admin şifresi (bakiye düzenleme gibi kritik işlemler için)
  adminPassword: {
    type: String,
    default: '1234' // Varsayılan şifre
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

settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
