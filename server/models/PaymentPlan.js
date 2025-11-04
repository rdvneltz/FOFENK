const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  installmentNumber: Number,
  amount: Number,
  dueDate: Date,
  paidAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: Date,
  paymentMethod: String, // 'cash', 'creditCard'
  isInvoiced: Boolean,
  invoiceNumber: String
}, { _id: false });

const paymentPlanSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentCourseEnrollment',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // Ödeme tipi: 'cashFull' (nakit peşin), 'cashInstallment' (nakit taksitli), 'creditCard' (kredi kartı)
  paymentType: {
    type: String,
    enum: ['cashFull', 'cashInstallment', 'creditCard'],
    required: true
  },
  // Toplam tutar (indirim uygulanmadan önce)
  totalAmount: {
    type: Number,
    required: true
  },
  // İndirim sonrası tutar
  discountedAmount: {
    type: Number,
    required: true
  },
  // Kredi kartı komisyonu
  creditCardCommission: {
    rate: Number,
    amount: Number
  },
  // KDV
  vat: {
    rate: Number,
    amount: Number
  },
  // Faturalı mı
  isInvoiced: {
    type: Boolean,
    default: false
  },
  // Taksitler
  installments: [installmentSchema],
  // Kredi kartı taksit sayısı (varsa)
  creditCardInstallments: Number,
  // Ödenen toplam tutar
  paidAmount: {
    type: Number,
    default: 0
  },
  // Kalan tutar
  remainingAmount: Number,
  // Tamamlandı mı
  isCompleted: {
    type: Boolean,
    default: false
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

paymentPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.remainingAmount = this.discountedAmount - this.paidAmount;
  next();
});

module.exports = mongoose.model('PaymentPlan', paymentPlanSchema);
