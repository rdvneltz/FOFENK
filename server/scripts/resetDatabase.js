const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../models/User');
const Institution = require('../models/Institution');
const Season = require('../models/Season');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Instructor = require('../models/Instructor');
const ScheduledLesson = require('../models/ScheduledLesson');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const PaymentPlan = require('../models/PaymentPlan');
const Expense = require('../models/Expense');
const PlannedExpense = require('../models/PlannedExpense');
const CashRegister = require('../models/CashRegister');
const TrialLesson = require('../models/TrialLesson');
const MessageTemplate = require('../models/MessageTemplate');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');

const resetDatabase = async () => {
  try {
    console.log('🔌 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fofora-theatre', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ MongoDB bağlantısı başarılı\n');
    console.log('⚠️  DİKKAT: Tüm veriler silinecek!\n');
    console.log('⏳ 3 saniye içinde silme işlemi başlayacak...\n');

    // 3 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Veriler siliniyor...\n');

    // Tüm koleksiyonları sil
    await Promise.all([
      User.deleteMany({}),
      Institution.deleteMany({}),
      Season.deleteMany({}),
      Student.deleteMany({}),
      Course.deleteMany({}),
      Instructor.deleteMany({}),
      ScheduledLesson.deleteMany({}),
      StudentCourseEnrollment.deleteMany({}),
      Attendance.deleteMany({}),
      Payment.deleteMany({}),
      PaymentPlan.deleteMany({}),
      Expense.deleteMany({}),
      PlannedExpense.deleteMany({}),
      CashRegister.deleteMany({}),
      TrialLesson.deleteMany({}),
      MessageTemplate.deleteMany({}),
      Settings.deleteMany({}),
      ActivityLog.deleteMany({}),
    ]);

    console.log('✅ Tüm koleksiyonlar temizlendi\n');

    // Sayıları kontrol et
    const counts = {
      'Kullanıcılar': await User.countDocuments(),
      'Kurumlar': await Institution.countDocuments(),
      'Sezonlar': await Season.countDocuments(),
      'Öğrenciler': await Student.countDocuments(),
      'Dersler': await Course.countDocuments(),
      'Eğitmenler': await Instructor.countDocuments(),
      'Planlı Dersler': await ScheduledLesson.countDocuments(),
      'Kayıtlar': await StudentCourseEnrollment.countDocuments(),
      'Devamsızlık': await Attendance.countDocuments(),
      'Ödemeler': await Payment.countDocuments(),
      'Ödeme Planları': await PaymentPlan.countDocuments(),
      'Giderler': await Expense.countDocuments(),
      'Planlı Giderler': await PlannedExpense.countDocuments(),
      'Kasalar': await CashRegister.countDocuments(),
      'Deneme Dersleri': await TrialLesson.countDocuments(),
      'Mesaj Şablonları': await MessageTemplate.countDocuments(),
      'Ayarlar': await Settings.countDocuments(),
      'Aktivite Logları': await ActivityLog.countDocuments(),
    };

    console.log('📊 Mevcut Kayıt Sayıları:');
    console.log('========================');
    Object.entries(counts).forEach(([name, count]) => {
      console.log(`${name}: ${count}`);
    });

    console.log('\n✅ Database başarıyla sıfırlandı!');
    console.log('🚀 Şimdi uygulamaya gidip /setup ekranından başlayabilirsiniz.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
};

resetDatabase();
