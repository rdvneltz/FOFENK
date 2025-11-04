const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: String,
  phone: String,
  role: {
    type: String,
    enum: ['admin', 'manager', 'accountant', 'staff'],
    default: 'staff'
  },
  // Yetkiler (basit yetki sistemi)
  permissions: {
    canManageStudents: { type: Boolean, default: true },
    canManageCourses: { type: Boolean, default: true },
    canManagePayments: { type: Boolean, default: true },
    canManageExpenses: { type: Boolean, default: true },
    canManageInstructors: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageSettings: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false }
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
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

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
