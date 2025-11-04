const mongoose = require('mongoose');

// Öğrencinin bir derse kayıt olması
const studentCourseEnrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // Kayıt tarihi (hangi tarihten itibaren ücretlendirme başlayacak)
  enrollmentDate: {
    type: Date,
    required: true
  },
  // Kayıt bitiş tarihi (isteğe bağlı, belirtilmezse sezon sonuna kadar)
  endDate: Date,
  // İndirim/Burs bilgisi
  discount: {
    type: {
      type: String,
      enum: ['none', 'percentage', 'fixed', 'fullScholarship'],
      default: 'none'
    },
    value: {
      type: Number,
      default: 0
    },
    description: String // 'Kardeş indirimi', 'Tam burslu' vb.
  },
  // Özel ücret (farklı bir ücret uygulanacaksa)
  customPrice: Number,
  // Aktif mi (öğrenci dersten ayrıldı mı)
  isActive: {
    type: Boolean,
    default: true
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

studentCourseEnrollmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('StudentCourseEnrollment', studentCourseEnrollmentSchema);
