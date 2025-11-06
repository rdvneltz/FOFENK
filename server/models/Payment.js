const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentPlan'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  // Ödeme tipi
  paymentType: {
    type: String,
    enum: ['cash', 'creditCard'],
    required: true
  },
  // Ödeme tutarı (öğrenciden alınan)
  amount: {
    type: Number,
    required: true
  },
  // Kasaya yansıyan tutar (komisyon ve KDV düşüldükten sonra)
  netAmount: Number,
  // Kredi kartı komisyonu
  creditCardCommission: {
    rate: Number,
    amount: Number
  },
  // KDV (sadece kayıt için, gider olarak ayrıca kaydedilir)
  vat: {
    rate: Number,
    amount: Number
  },
  // Faturalı mı
  isInvoiced: {
    type: Boolean,
    default: false
  },
  invoiceNumber: String,
  // Hangi kasaya yatırıldı
  cashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashRegister',
    required: true
  },
  // Kredi kartı taksit sayısı
  creditCardInstallments: Number,
  // Ödeme tarihi
  paymentDate: {
    type: Date,
    default: Date.now
  },
  // Taksit numarası (eğer bir ödeme planının parçasıysa)
  installmentNumber: Number,
  notes: String,
  // İade edildi mi
  isRefunded: {
    type: Boolean,
    default: false
  },
  refundDate: Date,
  refundAmount: Number,
  refundCashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashRegister'
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

paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
