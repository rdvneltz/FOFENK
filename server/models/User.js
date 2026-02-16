const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  fullName: {
    type: String,
    required: true
  },
  email: String,
  phone: String,
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'accountant', 'instructor', 'staff'],
    default: 'staff'
  },
  // Yetkiler (detaylı yetki sistemi)
  permissions: {
    // Temel Yetkiler
    canViewCalendar: { type: Boolean, default: true },
    canMarkAttendance: { type: Boolean, default: true },
    canManageScheduledLessons: { type: Boolean, default: true },
    // Öğrenci Yönetimi
    canManageStudents: { type: Boolean, default: true },
    canManageTrialLessons: { type: Boolean, default: true },
    // Ders & Eğitmen Yönetimi
    canManageCourses: { type: Boolean, default: true },
    canManageInstructors: { type: Boolean, default: true },
    // Ödeme & Tahsilat İşlemleri
    canManagePayments: { type: Boolean, default: true },
    canCreatePaymentPlans: { type: Boolean, default: true },
    canCollectPayments: { type: Boolean, default: true },
    // Gider İşlemleri
    canManageExpenses: { type: Boolean, default: true },
    canCreateExpenses: { type: Boolean, default: true },
    // Mali Görünürlük (hassas - kimin neyi görebileceği)
    canViewCashRegisters: { type: Boolean, default: true },
    canManageCashRegisters: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canViewDashboardFinancials: { type: Boolean, default: true },
    canViewPaymentAmounts: { type: Boolean, default: true },
    // Sistem Yönetimi
    canManageSettings: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canManageInstitutions: { type: Boolean, default: false },
    canViewActivityLogs: { type: Boolean, default: false }
  },
  // Kullanıcının erişebildiği kurumlar (superadmin hariç)
  institutions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  }],
  // Eski institution alanı - geriye dönük uyumluluk için
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatarColor: {
    type: String,
    default: '#1976d2' // Material-UI primary
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();

  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with salt rounds of 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);
