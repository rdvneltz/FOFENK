// WhatsApp helper utility for sending messages

/**
 * Format phone number for WhatsApp API
 * Converts Turkish format (05xx xxx xx xx) to international (905xxxxxxxxx)
 * @param {string} phone - Phone number in any format
 * @returns {string} - Formatted phone number for WhatsApp
 */
export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return '';

  // Remove all non-numeric characters
  let cleanPhone = phone.replace(/[^0-9]/g, '');

  // Handle Turkish phone numbers
  // If starts with 0, replace with 90 (Turkey country code)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '90' + cleanPhone.slice(1);
  }
  // If starts with 5 (mobile without country code), add 90
  else if (cleanPhone.startsWith('5') && cleanPhone.length === 10) {
    cleanPhone = '90' + cleanPhone;
  }
  // If doesn't start with country code but has 10 digits, add 90
  else if (cleanPhone.length === 10 && !cleanPhone.startsWith('90')) {
    cleanPhone = '90' + cleanPhone;
  }

  return cleanPhone;
};

/**
 * Replace template variables in message
 * @param {string} message - Message template with variables
 * @param {object} data - Data object with values to replace
 * @returns {string} - Message with replaced variables
 */
export const replaceTemplateVariables = (message, data = {}) => {
  if (!message) return '';

  let result = message;

  // Common replacements
  const replacements = {
    // Kişi bilgileri
    '{studentName}': data.studentName || data.name || '',
    '{name}': data.name || data.studentName || '',
    '{recipientName}': data.recipientName || data.parentName || data.studentName || '',
    '{parentName}': data.parentName || '',
    '{motherName}': data.motherName || '',
    '{fatherName}': data.fatherName || '',
    '{phone}': data.phone || '',
    '{email}': data.email || '',

    // Kurs/Kurum bilgileri
    '{courseName}': data.courseName || '',
    '{seasonName}': data.seasonName || '',
    '{institutionName}': data.institutionName || '',

    // Tarih/Saat bilgileri
    '{date}': data.date ? new Date(data.date).toLocaleDateString('tr-TR') : '',
    '{time}': data.time || '',
    '{dueDate}': data.dueDate ? new Date(data.dueDate).toLocaleDateString('tr-TR') : '',
    '{paymentDate}': data.paymentDate ? new Date(data.paymentDate).toLocaleDateString('tr-TR') : '',

    // Tutar bilgileri
    '{amount}': data.amount ? `${Number(data.amount).toLocaleString('tr-TR')} TL` : '',
    '{totalAmount}': data.totalAmount ? `${Number(data.totalAmount).toLocaleString('tr-TR')} TL` : '',
    '{paidAmount}': data.paidAmount ? `${Number(data.paidAmount).toLocaleString('tr-TR')} TL` : '',
    '{remainingAmount}': data.remainingAmount ? `${Number(data.remainingAmount).toLocaleString('tr-TR')} TL` : '',
    '{installmentAmount}': data.installmentAmount ? `${Number(data.installmentAmount).toLocaleString('tr-TR')} TL` : '',
    '{commissionAmount}': data.commissionAmount ? `${Number(data.commissionAmount).toLocaleString('tr-TR')} TL` : '',

    // Taksit bilgileri
    '{installmentNumber}': data.installmentNumber || '',
    '{totalInstallments}': data.totalInstallments || '',
    '{paidInstallments}': data.paidInstallments || '',
    '{remainingInstallments}': data.remainingInstallments || '',
    '{overdueDays}': data.overdueDays || '',

    // Ödeme yöntemi
    '{paymentMethod}': data.paymentMethod || '',

    // Detaylı listeler
    '{installmentDetails}': data.installmentDetails || '',
    '{remainingInstallmentsList}': data.remainingInstallmentsList || '',
    '{paidInstallmentsList}': data.paidInstallmentsList || '',
    '{monthlySchedule}': data.monthlySchedule || '',
    '{lessonsPerMonth}': data.lessonsPerMonth || '',
    '{monthlyDetailsList}': data.monthlyDetailsList || '',
  };

  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return result;
};

/**
 * All available template variables with descriptions
 */
export const TEMPLATE_VARIABLES = [
  // Kişi bilgileri
  { key: '{recipientName}', label: 'Alıcı Adı', description: 'Mesajı alan kişinin adı (öğrenci/veli)', category: 'person' },
  { key: '{studentName}', label: 'Öğrenci Adı', description: 'Öğrencinin adı soyadı', category: 'person' },
  { key: '{parentName}', label: 'Veli Adı', description: 'Velinin adı soyadı', category: 'person' },
  { key: '{motherName}', label: 'Anne Adı', description: 'Annenin adı soyadı', category: 'person' },
  { key: '{fatherName}', label: 'Baba Adı', description: 'Babanın adı soyadı', category: 'person' },
  { key: '{phone}', label: 'Telefon', description: 'İletişim telefon numarası', category: 'person' },
  { key: '{email}', label: 'Email', description: 'E-posta adresi', category: 'person' },

  // Kurs/Kurum bilgileri
  { key: '{courseName}', label: 'Kurs Adı', description: 'Kayıtlı olunan kurs', category: 'course' },
  { key: '{seasonName}', label: 'Sezon Adı', description: 'Dönem/sezon adı', category: 'course' },
  { key: '{institutionName}', label: 'Kurum Adı', description: 'Kurumun adı', category: 'course' },

  // Tarih/Saat bilgileri
  { key: '{date}', label: 'Tarih', description: 'İlgili tarih', category: 'date' },
  { key: '{time}', label: 'Saat', description: 'İlgili saat', category: 'date' },
  { key: '{dueDate}', label: 'Vade Tarihi', description: 'Ödeme vade tarihi', category: 'date' },
  { key: '{paymentDate}', label: 'Ödeme Tarihi', description: 'Ödemenin yapıldığı tarih', category: 'date' },

  // Tutar bilgileri
  { key: '{amount}', label: 'Tutar', description: 'İlgili tutar', category: 'amount' },
  { key: '{totalAmount}', label: 'Toplam Tutar', description: 'Toplam ödeme tutarı', category: 'amount' },
  { key: '{paidAmount}', label: 'Ödenen Tutar', description: 'Şimdiye kadar ödenen tutar', category: 'amount' },
  { key: '{remainingAmount}', label: 'Kalan Tutar', description: 'Kalan borç tutarı', category: 'amount' },
  { key: '{installmentAmount}', label: 'Taksit Tutarı', description: 'Her bir taksit tutarı', category: 'amount' },
  { key: '{commissionAmount}', label: 'Komisyon Tutarı', description: 'Kredi kartı komisyon tutarı', category: 'amount' },

  // Taksit bilgileri
  { key: '{installmentNumber}', label: 'Taksit No', description: 'Mevcut taksit numarası', category: 'installment' },
  { key: '{totalInstallments}', label: 'Toplam Taksit', description: 'Toplam taksit sayısı', category: 'installment' },
  { key: '{paidInstallments}', label: 'Ödenen Taksit', description: 'Ödenen taksit sayısı', category: 'installment' },
  { key: '{remainingInstallments}', label: 'Kalan Taksit', description: 'Kalan taksit sayısı', category: 'installment' },
  { key: '{overdueDays}', label: 'Gecikme Gün', description: 'Geciken gün sayısı', category: 'installment' },

  // Ödeme yöntemi
  { key: '{paymentMethod}', label: 'Ödeme Yöntemi', description: 'Nakit/Kredi Kartı/Havale', category: 'payment' },

  // Detaylı listeler
  { key: '{installmentDetails}', label: 'Taksit Detayları', description: 'Tüm taksitlerin listesi', category: 'list' },
  { key: '{remainingInstallmentsList}', label: 'Kalan Taksitler', description: 'Kalan taksitlerin listesi', category: 'list' },
  { key: '{paidInstallmentsList}', label: 'Ödenen Taksitler', description: 'Ödenen taksitlerin listesi', category: 'list' },
  { key: '{monthlySchedule}', label: 'Aylık Program', description: 'Aylık ödeme programı', category: 'list' },
  { key: '{lessonsPerMonth}', label: 'Aylık Ders Sayısı', description: 'Her ay için ders sayıları', category: 'list' },
  { key: '{monthlyDetailsList}', label: 'Aylık Ders Programı', description: 'Her ay için ders sayısı ve ücret detayları', category: 'list' },
];

/**
 * Open WhatsApp with pre-filled message
 * @param {string} phone - Phone number
 * @param {string} message - Pre-filled message (optional)
 * @param {object} templateData - Data to replace in template (optional)
 */
export const sendWhatsAppMessage = (phone, message = '', templateData = {}) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);

  if (!formattedPhone) {
    console.error('Invalid phone number');
    return false;
  }

  // Replace template variables if message and data provided
  const finalMessage = message ? replaceTemplateVariables(message, templateData) : '';

  // Encode message for URL
  const encodedMessage = encodeURIComponent(finalMessage);

  // Build WhatsApp URL
  const url = finalMessage
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : `https://wa.me/${formattedPhone}`;

  // Open in new tab
  window.open(url, '_blank');

  return true;
};

/**
 * Default message templates for quick access
 */
export const DEFAULT_WHATSAPP_TEMPLATES = {
  // Ödeme planı oluşturuldu - Detaylı kayıt bilgisi
  paymentPlanCreated: `Sayın {recipientName},

{studentName} için kayıt işlemi tamamlanmıştır.

📚 *KAYIT BİLGİLERİ*
Kurs: {courseName}
Sezon: {seasonName}

📅 *AYLIK DERS PROGRAMI*
{lessonsPerMonth}

💰 *ÖDEME DETAYLARI*
Toplam Tutar: {totalAmount}
Ödeme Yöntemi: {paymentMethod}
Taksit Sayısı: {totalInstallments}
Taksit Tutarı: {installmentAmount}
{commissionAmount}

📋 *ÖDEME TAKVİMİ*
{monthlySchedule}

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
{institutionName}`,

  // Ödeme alındı - Kalan taksitlerle birlikte
  paymentReceived: `Sayın {recipientName},

{studentName} için ödemeniz alınmıştır.

✅ *ÖDEME BİLGİLERİ*
Ödenen Tutar: {amount}
Ödeme Tarihi: {paymentDate}
Ödeme Yöntemi: {paymentMethod}

📊 *GÜNCEL DURUM*
Toplam Tutar: {totalAmount}
Ödenen Toplam: {paidAmount}
Kalan Borç: {remainingAmount}
Ödenen Taksit: {paidInstallments}/{totalInstallments}

📋 *KALAN TAKSİTLER*
{remainingInstallmentsList}

Teşekkür ederiz.

Saygılarımızla,
{institutionName}`,

  // Vadesi yaklaşan ödeme hatırlatması
  paymentDueReminder: `Sayın {recipientName},

{studentName} için ödeme hatırlatması:

⏰ *YAKLAŞAN ÖDEME*
Taksit No: {installmentNumber}/{totalInstallments}
Taksit Tutarı: {amount}
Son Ödeme Tarihi: {dueDate}

📊 *GÜNCEL DURUM*
Toplam Tutar: {totalAmount}
Ödenen: {paidAmount}
Kalan Borç: {remainingAmount}

Ödemenizi zamanında yapmanızı rica ederiz.

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
{institutionName}`,

  // Vadesi geçmiş ödeme
  paymentOverdue: `Sayın {recipientName},

{studentName} için gecikmiş ödeme bildirimi:

⚠️ *GECİKMİŞ ÖDEME*
Taksit No: {installmentNumber}/{totalInstallments}
Taksit Tutarı: {amount}
Vade Tarihi: {dueDate}
Gecikme: {overdueDays} gün

📊 *GÜNCEL DURUM*
Toplam Borç: {totalAmount}
Ödenen: {paidAmount}
Kalan Borç: {remainingAmount}

Lütfen en kısa sürede ödemenizi yapınız.

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
{institutionName}`,

  // Bakiye özeti - Tüm taksit detaylarıyla
  balanceSummary: `Sayın {recipientName},

{studentName} için bakiye özeti:

📊 *GENEL DURUM*
Kurs: {courseName}
Toplam Tutar: {totalAmount}
Ödenen: {paidAmount}
Kalan Borç: {remainingAmount}
Ödenen Taksit: {paidInstallments}/{totalInstallments}

📅 *AYLIK DERS PROGRAMI*
{monthlyDetailsList}

✅ *ÖDENEN TAKSİTLER*
{paidInstallmentsList}

📋 *KALAN TAKSİTLER*
{remainingInstallmentsList}

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
{institutionName}`,

  // Kayıt onayı
  registrationConfirm: `Sayın {recipientName},

{studentName} için {courseName} kursuna kayıt talebiniz alınmıştır.

En kısa sürede sizinle iletişime geçeceğiz.

Saygılarımızla,
{institutionName}`,

  // Deneme dersi hatırlatma
  trialLessonReminder: `Sayın {recipientName},

{studentName} için deneme dersi hatırlatması:

📅 *DERS BİLGİLERİ*
Kurs: {courseName}
Tarih: {date}
Saat: {time}

Lütfen 10 dakika önce gelerek hazırlıklarınızı yapınız.

Görüşmek üzere!
{institutionName}`,

  // Ders hatırlatma
  lessonReminder: `Sayın {recipientName},

{studentName} için ders hatırlatması:

📅 *DERS BİLGİLERİ*
Kurs: {courseName}
Tarih: {date}
Saat: {time}

Lütfen zamanında gelerek hazırlıklarınızı yapınız.

Saygılarımızla,
{institutionName}`,

  // Genel mesaj
  general: `Sayın {recipientName},

{studentName} hakkında bilgilendirme.

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
{institutionName}`,
};

const whatsappHelper = {
  formatPhoneForWhatsApp,
  replaceTemplateVariables,
  sendWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATES,
  TEMPLATE_VARIABLES,
};

export default whatsappHelper;
