/**
 * Tarih aralığındaki belirli bir günün tekrarlarını hesaplar
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {Number} dayOfWeek - Gün (1: Pazartesi, 2: Salı, ..., 7: Pazar)
 * @returns {Array} Tarih dizisi
 */
const getRecurringDates = (startDate, endDate, dayOfWeek) => {
  const dates = [];
  const current = new Date(startDate);

  // dayOfWeek'i JavaScript formatına çevir (1:Pazartesi -> 1, 7:Pazar -> 0)
  const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;

  // Başlangıç tarihini istenen güne ayarla
  while (current.getDay() !== targetDay && current <= endDate) {
    current.setDate(current.getDate() + 1);
  }

  // Her hafta tekrarla
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
};

/**
 * Tarih aralığındaki belirli günlerdeki tekrarları hesaplar (çoklu günler)
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {Array<Number>} daysOfWeek - Günler dizisi [1,3,5] => Pazartesi, Çarşamba, Cuma (7=Pazar)
 * @returns {Array} Tarih dizisi
 */
const getRecurringDatesMultiple = (startDate, endDate, daysOfWeek) => {
  const dates = [];
  const current = new Date(startDate);

  // Günleri JavaScript formatına çevir
  const targetDays = daysOfWeek.map(day => day === 7 ? 0 : day);

  while (current <= endDate) {
    if (targetDays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates.sort((a, b) => a - b);
};

/**
 * İki haftalık periyotla tekrarlanan tarihleri hesaplar
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {Number} dayOfWeek - Gün (1: Pazartesi, ..., 7: Pazar)
 * @returns {Array} Tarih dizisi
 */
const getBiweeklyDates = (startDate, endDate, dayOfWeek) => {
  const dates = [];
  const current = new Date(startDate);

  // dayOfWeek'i JavaScript formatına çevir
  const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;

  // İlk uygun güne git
  while (current.getDay() !== targetDay && current <= endDate) {
    current.setDate(current.getDate() + 1);
  }

  // İki hafta aralıklarla tekrarla
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 14);
  }

  return dates;
};

/**
 * Aylık tekrarlanan tarihleri hesaplar
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {Number} dayOfMonth - Ayın günü (1-31)
 * @returns {Array} Tarih dizisi
 */
const getMonthlyDates = (startDate, endDate, dayOfMonth) => {
  const dates = [];
  const current = new Date(startDate);

  // İlk uygun güne git
  current.setDate(dayOfMonth);
  if (current < startDate) {
    current.setMonth(current.getMonth() + 1);
  }

  // Her ay tekrarla
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return dates;
};

/**
 * Bir aydaki belirli bir günün kaç kez tekrarlandığını hesaplar
 * @param {Number} year - Yıl
 * @param {Number} month - Ay (0-11)
 * @param {Number} dayOfWeek - Gün (1: Pazartesi, ..., 7: Pazar)
 * @returns {Number} Tekrar sayısı
 */
const getWeekdayCountInMonth = (year, month, dayOfWeek) => {
  let count = 0;
  const date = new Date(year, month, 1);

  // dayOfWeek'i JavaScript formatına çevir
  const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;

  while (date.getMonth() === month) {
    if (date.getDay() === targetDay) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }

  return count;
};

/**
 * Türkiye resmi tatil günlerini döndürür
 * @param {Number} year - Yıl
 * @returns {Array} Tatil tarihleri
 */
const getTurkishHolidays = (year) => {
  return [
    new Date(year, 0, 1),  // Yılbaşı
    new Date(year, 3, 23), // 23 Nisan
    new Date(year, 4, 1),  // 1 Mayıs
    new Date(year, 4, 19), // 19 Mayıs
    new Date(year, 6, 15), // 15 Temmuz
    new Date(year, 7, 30), // 30 Ağustos
    new Date(year, 9, 29), // 29 Ekim
    // Ramazan ve Kurban Bayramları her yıl değişir, manuel eklenebilir
  ];
};

/**
 * KDV hesaplar
 * @param {Number} amount - Tutar
 * @param {Number} vatRate - KDV oranı (%)
 * @returns {Object} { amount, vat, total }
 */
const calculateVAT = (amount, vatRate) => {
  const vat = (amount * vatRate) / 100;
  const total = amount + vat;
  return {
    amount: parseFloat(amount.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

/**
 * Kredi kartı komisyon hesaplar
 * @param {Number} amount - Tutar
 * @param {Number} commissionRate - Komisyon oranı (%)
 * @returns {Object} { amount, commission, total }
 */
const calculateCommission = (amount, commissionRate) => {
  const commission = (amount * commissionRate) / 100;
  const total = amount + commission;
  return {
    amount: parseFloat(amount.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

/**
 * Ödeme planı için net tutar hesaplar (komisyon ve KDV düşüldükten sonra)
 * @param {Number} grossAmount - Brüt tutar (öğrenciden alınan)
 * @param {Number} commissionRate - Komisyon oranı (%)
 * @param {Number} vatRate - KDV oranı (%)
 * @param {Boolean} isInvoiced - Faturalı mı
 * @returns {Object} Detaylı hesap
 */
const calculateNetAmount = (grossAmount, commissionRate = 0, vatRate = 0, isInvoiced = false) => {
  let commission = 0;
  let vat = 0;

  if (commissionRate > 0) {
    commission = (grossAmount * commissionRate) / 100;
  }

  if (isInvoiced && vatRate > 0) {
    vat = (grossAmount * vatRate) / 100;
  }

  const netAmount = grossAmount - commission - vat;

  return {
    grossAmount: parseFloat(grossAmount.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2))
  };
};

/**
 * Türkçe gün adını döndürür
 * @param {Number} dayOfWeek - Gün (1: Pazartesi, ..., 7: Pazar)
 * @returns {String} Gün adı
 */
const getDayNameTR = (dayOfWeek) => {
  const days = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  return days[dayOfWeek];
};

/**
 * Türkçe ay adını döndürür
 * @param {Number} month - Ay (0-11)
 * @returns {String} Ay adı
 */
const getMonthNameTR = (month) => {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return months[month];
};

module.exports = {
  getRecurringDates,
  getRecurringDatesMultiple,
  getBiweeklyDates,
  getMonthlyDates,
  getWeekdayCountInMonth,
  getTurkishHolidays,
  calculateVAT,
  calculateCommission,
  calculateNetAmount,
  getDayNameTR,
  getMonthNameTR
};
