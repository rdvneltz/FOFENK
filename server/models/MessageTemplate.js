const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // Mesaj şablonu (değişkenler: {studentName}, {parentName}, {courseName}, {amount}, {date}, {time})
  template: {
    type: String,
    required: true
  },
  // Şablon tipi
  type: {
    type: String,
    enum: [
      'paymentPlanCreated',    // Ödeme planı oluşturuldu
      'paymentReceived',       // Ödeme alındı
      'paymentDueReminder',    // Vadesi yaklaşan ödeme hatırlatması
      'paymentOverdue',        // Vadesi geçmiş ödeme
      'balanceSummary',        // Bakiye özeti
      'registrationConfirm',   // Kayıt onayı
      'trialLessonReminder',   // Deneme dersi hatırlatma
      'lessonReminder',        // Ders hatırlatma
      'general'                // Genel
    ],
    required: true
  },
  // Hangi sayfalarda gösterileceği
  showOnPages: {
    type: [String],
    enum: [
      'students',              // Öğrenciler sayfası
      'trialLessons',          // Deneme dersleri sayfası
      'phoneBook',             // Telefon rehberi sayfası
      'paymentPlanDetail',     // Ödeme planı detay sayfası
      'paymentPlanCreate',     // Ödeme planı oluşturma
      'dashboardPayments',     // Dashboard ödemeler
      'dashboardLessons',      // Dashboard dersler
      'allPages'               // Tüm sayfalar
    ],
    default: ['allPages']
  },
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
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

messageTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema);
