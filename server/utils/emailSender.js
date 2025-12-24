const nodemailer = require('nodemailer');
const path = require('path');

// Turkey timezone offset (UTC+3) in milliseconds
// Needed because dates stored in MongoDB as UTC need to be adjusted
const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

// Helper function to format date as dd.mm.yyyy with Turkey timezone
const formatDateTR = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const year = adjusted.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

// SMTP transporter oluştur
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Genel email gönderme fonksiyonu
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Fofora Tiyatro" <noreply@fofora.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // HTML'den text çıkar
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email gönderildi:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    throw error;
  }
};

// Ödeme planı emaili şablonu
const sendPaymentPlanEmail = async ({ student, paymentPlan, pdfPath }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .footer { text-align: center; margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
        .plan-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .plan-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .highlight { color: #1976d2; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ödeme Planınız Hazır!</h1>
        </div>
        <div class="content">
          <p>Sayın ${student.firstName} ${student.lastName},</p>

          <p>Fofora Tiyatro olarak sizin için hazırladığımız ödeme planınız ektedir.</p>

          <div class="plan-details">
            <h3>Plan Özeti</h3>
            <div class="plan-item">
              <span>Toplam Tutar:</span>
              <span class="highlight">₺${paymentPlan.totalAmount?.toLocaleString('tr-TR')}</span>
            </div>
            <div class="plan-item">
              <span>Taksit Sayısı:</span>
              <span class="highlight">${paymentPlan.installments?.length || 0} Taksit</span>
            </div>
            <div class="plan-item">
              <span>Plan Başlangıç:</span>
              <span>${formatDateTR(paymentPlan.startDate)}</span>
            </div>
          </div>

          <p>Detaylı ödeme planınızı ekte PDF formatında bulabilirsiniz.</p>

          <p>Herhangi bir sorunuz olması durumunda bizimle iletişime geçmekten çekinmeyin.</p>

          <p>Saygılarımızla,<br><strong>Fofora Tiyatro Ekibi</strong></p>
        </div>
        <div class="footer">
          <p>Bu bir otomatik mesajdır, lütfen yanıtlamayınız.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = pdfPath ? [
    {
      filename: 'odeme-plani.pdf',
      path: pdfPath,
    }
  ] : [];

  return sendEmail({
    to: student.email,
    subject: 'Ödeme Planınız - Fofora Tiyatro',
    html,
    attachments,
  });
};

// Ödeme hatırlatma emaili
const sendPaymentReminderEmail = async ({ student, duePayments }) => {
  const totalDue = duePayments.reduce((sum, payment) => sum + payment.amount, 0);

  const paymentsListHTML = duePayments.map(payment => `
    <div class="plan-item">
      <span>${formatDateTR(payment.dueDate)}</span>
      <span class="highlight">₺${payment.amount.toLocaleString('tr-TR')}</span>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f57c00; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .footer { text-align: center; margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
        .plan-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .plan-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .highlight { color: #f57c00; font-weight: bold; }
        .warning { background-color: #fff3cd; padding: 10px; border-left: 4px solid #f57c00; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ödeme Hatırlatması</h1>
        </div>
        <div class="content">
          <p>Sayın ${student.firstName} ${student.lastName},</p>

          <div class="warning">
            <p><strong>Yaklaşan veya gecikmiş ödemeleriniz bulunmaktadır.</strong></p>
          </div>

          <div class="plan-details">
            <h3>Bekleyen Ödemeler</h3>
            ${paymentsListHTML}
            <div class="plan-item" style="border-top: 2px solid #f57c00; margin-top: 10px; padding-top: 10px;">
              <span><strong>Toplam:</strong></span>
              <span class="highlight">₺${totalDue.toLocaleString('tr-TR')}</span>
            </div>
          </div>

          <p>Ödemelerinizi zamanında yapmanız için size hatırlatmak istedik.</p>

          <p>Ödeme yapmak için kurumumuza ulaşabilir veya online ödeme yöntemlerimizi kullanabilirsiniz.</p>

          <p>Saygılarımızla,<br><strong>Fofora Tiyatro Ekibi</strong></p>
        </div>
        <div class="footer">
          <p>Bu bir otomatik mesajdır, lütfen yanıtlamayınız.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: student.email,
    subject: 'Ödeme Hatırlatması - Fofora Tiyatro',
    html,
  });
};

// Hoşgeldin emaili
const sendWelcomeEmail = async ({ student, course }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .footer { text-align: center; margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
        .course-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4caf50; }
        .highlight { color: #4caf50; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 Hoş Geldiniz!</h1>
        </div>
        <div class="content">
          <p>Sayın ${student.firstName} ${student.lastName},</p>

          <p>Fofora Tiyatro ailesine katıldığınız için çok mutluyuz!</p>

          ${course ? `
          <div class="course-info">
            <h3>Kayıt Olduğunuz Kurs</h3>
            <p><strong>${course.name}</strong></p>
            ${course.description ? `<p>${course.description}</p>` : ''}
          </div>
          ` : ''}

          <p>Bizimle yeni bir sanat yolculuğuna başlıyorsunuz. Eğitim süreciniz boyunca size en iyi deneyimi sunmak için buradayız.</p>

          <p>Herhangi bir sorunuz veya ihtiyacınız olduğunda bizimle iletişime geçmekten çekinmeyin.</p>

          <p>Başarılar dileriz!<br><strong>Fofora Tiyatro Ekibi</strong></p>
        </div>
        <div class="footer">
          <p>Bu bir otomatik mesajdır, lütfen yanıtlamayınız.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: student.email,
    subject: 'Hoş Geldiniz - Fofora Tiyatro',
    html,
  });
};

// Deneme dersi hatırlatma emaili
const sendTrialLessonReminderEmail = async ({ trialStudent, lesson }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #9c27b0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .footer { text-align: center; margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
        .lesson-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .info-item { padding: 8px 0; border-bottom: 1px solid #eee; }
        .highlight { color: #9c27b0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 Deneme Dersi Hatırlatması</h1>
        </div>
        <div class="content">
          <p>Sayın ${trialStudent.firstName} ${trialStudent.lastName},</p>

          <p>Deneme dersiniz yaklaşıyor! Size hatırlatmak istedik.</p>

          <div class="lesson-info">
            <h3>Ders Detayları</h3>
            ${lesson.date ? `
            <div class="info-item">
              <strong>Tarih:</strong> ${formatDateTR(lesson.date)}
            </div>
            ` : ''}
            ${lesson.time ? `
            <div class="info-item">
              <strong>Saat:</strong> ${lesson.time}
            </div>
            ` : ''}
            ${lesson.location ? `
            <div class="info-item">
              <strong>Yer:</strong> ${lesson.location}
            </div>
            ` : ''}
            ${lesson.instructor ? `
            <div class="info-item">
              <strong>Eğitmen:</strong> ${lesson.instructor}
            </div>
            ` : ''}
          </div>

          <p>Lütfen dersinize 10 dakika önce gelerek hazırlıklarınızı yapınız.</p>

          <p>Herhangi bir değişiklik veya iptal durumunda lütfen bizimle iletişime geçiniz.</p>

          <p>Görüşmek üzere!<br><strong>Fofora Tiyatro Ekibi</strong></p>
        </div>
        <div class="footer">
          <p>Bu bir otomatik mesajdır, lütfen yanıtlamayınız.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: trialStudent.email,
    subject: 'Deneme Dersi Hatırlatması - Fofora Tiyatro',
    html,
  });
};

// Özel email şablonu
const sendCustomEmail = async ({ to, subject, message, studentName }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
        .footer { text-align: center; margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
        .message { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${subject}</h1>
        </div>
        <div class="content">
          ${studentName ? `<p>Sayın ${studentName},</p>` : ''}

          <div class="message">
            ${message}
          </div>

          <p>Saygılarımızla,<br><strong>Fofora Tiyatro Ekibi</strong></p>
        </div>
        <div class="footer">
          <p>Bu bir otomatik mesajdır, lütfen yanıtlamayınız.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
};

module.exports = {
  sendEmail,
  sendPaymentPlanEmail,
  sendPaymentReminderEmail,
  sendWelcomeEmail,
  sendTrialLessonReminderEmail,
  sendCustomEmail,
};
