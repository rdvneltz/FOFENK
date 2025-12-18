const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Kira',
      'Elektrik',
      'Su',
      'Doğalgaz',
      'İnternet',
      'Telefon',
      'Kırtasiye',
      'Temizlik Malzemeleri',
      'Ofis Malzemeleri',
      'Bakım Onarım',
      'Eğitmen Ödemesi',
      'Dekorasyon',
      'Kostüm/Aksesuar',
      'Sahne Malzemeleri',
      'Çay/Kahve',
      'Yemek',
      'Ulaşım',
      'Reklam ve Tanıtım',
      'Sigorta',
      'Vergi',
      'Muhasebe',
      'Hukuk',
      'Danışmanlık',
      'Web Hosting/Domain',
      'Yazılım Lisansı',
      'Müzik/Ses Sistemi',
      'Işık Ekipmanları',
      'Kamera/Fotoğraf',
      'Etkinlik Gideri',
      'Eğitim Materyali',
      'Diğer'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  // Tutar tipi
  amountType: {
    type: String,
    enum: ['fixed', 'variable'],
    default: 'fixed'
  },
  // Sabit tutar veya tahmini tutar (değişken için)
  estimatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Tekrar sıklığı
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  // Vade günü tipi
  dueDayType: {
    type: String,
    enum: ['fixed', 'range'],
    default: 'fixed'
  },
  // Sabit vade günü (ayın kaçı)
  dueDay: {
    type: Number,
    min: 1,
    max: 31,
    default: 1
  },
  // Vade günü aralığı (örn: 1-5 arası)
  dueDayRangeStart: {
    type: Number,
    min: 1,
    max: 31
  },
  dueDayRangeEnd: {
    type: Number,
    min: 1,
    max: 31
  },
  // Başlangıç tarihi (geriye dönük giderler için)
  startDate: {
    type: Date,
    required: true
  },
  // Bitiş tarihi (opsiyonel - süresiz için null)
  endDate: {
    type: Date,
    default: null
  },
  // Varsayılan kasa
  defaultCashRegister: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CashRegister'
  },
  // Aktif mi
  isActive: {
    type: Boolean,
    default: true
  },
  // Notlar
  notes: {
    type: String,
    trim: true
  },
  // Kurum ve sezon
  institution: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true
  },
  // Audit fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Pre-save middleware to update updatedAt
recurringExpenseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual to get next due date
recurringExpenseSchema.virtual('nextDueDate').get(function() {
  const now = new Date();
  const dueDay = this.dueDayType === 'fixed' ? this.dueDay : this.dueDayRangeStart;

  let nextDate = new Date(now.getFullYear(), now.getMonth(), dueDay);

  // If the due date has passed this month, move to next month
  if (nextDate < now) {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
});

// Enable virtuals in JSON
recurringExpenseSchema.set('toJSON', { virtuals: true });
recurringExpenseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);
