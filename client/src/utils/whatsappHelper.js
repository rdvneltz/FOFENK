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
    '{studentName}': data.studentName || data.name || '',
    '{name}': data.name || data.studentName || '',
    '{parentName}': data.parentName || '',
    '{courseName}': data.courseName || '',
    '{amount}': data.amount ? `${data.amount.toLocaleString('tr-TR')} TL` : '',
    '{date}': data.date ? new Date(data.date).toLocaleDateString('tr-TR') : '',
    '{time}': data.time || '',
    '{phone}': data.phone || '',
    '{email}': data.email || '',
    '{dueDate}': data.dueDate ? new Date(data.dueDate).toLocaleDateString('tr-TR') : '',
    '{totalAmount}': data.totalAmount ? `${data.totalAmount.toLocaleString('tr-TR')} TL` : '',
    '{paidAmount}': data.paidAmount ? `${data.paidAmount.toLocaleString('tr-TR')} TL` : '',
    '{remainingAmount}': data.remainingAmount ? `${data.remainingAmount.toLocaleString('tr-TR')} TL` : '',
    '{installmentNumber}': data.installmentNumber || '',
    '{totalInstallments}': data.totalInstallments || '',
  };

  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return result;
};

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
  paymentReminder: `Sayın {studentName},

Fofora Tiyatro ödeme hatırlatması:

Taksit Tutarı: {amount}
Son Ödeme Tarihi: {dueDate}

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
Fofora Tiyatro`,

  paymentPlanStatus: `Sayın {studentName},

Ödeme Planı Durumu:
Toplam Tutar: {totalAmount}
Ödenen: {paidAmount}
Kalan: {remainingAmount}

Detaylı bilgi için iletişime geçebilirsiniz.

Saygılarımızla,
Fofora Tiyatro`,

  trialLessonReminder: `Sayın {studentName},

Deneme dersiniz için hatırlatma:
Tarih: {date}
Saat: {time}

Lütfen 10 dakika önce gelerek hazırlıklarınızı yapınız.

Görüşmek üzere!
Fofora Tiyatro`,

  lessonReminder: `Sayın {studentName},

Dersiniz yaklaşıyor!
Tarih: {date}
Saat: {time}

Lütfen zamanında gelerek hazırlıklarınızı yapınız.

Saygılarımızla,
Fofora Tiyatro`,
};

const whatsappHelper = {
  formatPhoneForWhatsApp,
  replaceTemplateVariables,
  sendWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATES,
};

export default whatsappHelper;
