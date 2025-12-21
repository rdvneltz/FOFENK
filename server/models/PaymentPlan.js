const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  installmentNumber: Number,
  amount: Number, // Toplam tutar (komisyon + KDV dahil)
  baseAmount: Number, // Ana tutar (komisyon/KDV hariç)
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
  paymentMethod: {
    type: String,
    enum: ['cash', 'creditCard'],
    default: 'cash'
  },
  // Kredi kartı taksit sayısı (sadece creditCard için)
  creditCardInstallments: Number,
  // Komisyon bilgisi
  commission: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 0
  },
  // KDV bilgisi
  vat: {
    type: Number,
    default: 0
  },
  vatRate: {
    type: Number,
    default: 0
  },
  isInvoiced: {
    type: Boolean,
    default: false
  },
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
  // Ödeme tipi: 'cashFull' (tek seferde), 'cashInstallment' (taksitli), 'creditCard' (kredi kartı), 'mixed' (karma)
  paymentType: {
    type: String,
    enum: ['cashFull', 'cashInstallment', 'creditCard', 'mixed'],
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
  // Kredi kartı ödeme tarihi (gelecekte ise pending)
  paymentDate: Date,
  // Ödeme pending durumda mı (kredi kartı için)
  isPendingPayment: {
    type: Boolean,
    default: false
  },
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
  // Ödeme planının kapsadığı dönem
  periodStartDate: {
    type: Date,
    required: true
  },
  periodEndDate: {
    type: Date,
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
