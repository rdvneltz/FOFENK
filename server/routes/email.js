const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const PaymentPlan = require('../models/PaymentPlan');
const TrialLesson = require('../models/TrialLesson');
const {
  sendEmail,
  sendPaymentPlanEmail,
  sendPaymentReminderEmail,
  sendWelcomeEmail,
  sendTrialLessonReminderEmail,
  sendCustomEmail,
} = require('../utils/emailSender');

// Multer configuration for attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/email-attachments';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// POST /api/email/send - Genel email gönder
router.post('/send', upload.array('attachments', 5), async (req, res) => {
  try {
    const { to, subject, message, studentName } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ message: 'To, subject ve message gereklidir' });
    }

    const attachments = req.files
      ? req.files.map((file) => ({
          filename: file.originalname,
          path: file.path,
        }))
      : [];

    await sendCustomEmail({
      to,
      subject,
      message,
      studentName,
    });

    // Clean up uploaded files after sending
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.json({ message: 'Email başarıyla gönderildi' });
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    res.status(500).json({ message: 'Email gönderilemedi', error: error.message });
  }
});

// POST /api/email/payment-plan - Ödeme planı gönder
router.post('/payment-plan', async (req, res) => {
  try {
    const { studentId, paymentPlanId, pdfPath } = req.body;

    if (!studentId || !paymentPlanId) {
      return res.status(400).json({ message: 'StudentId ve paymentPlanId gereklidir' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    if (!student.email) {
      return res.status(400).json({ message: 'Öğrencinin email adresi yok' });
    }

    const paymentPlan = await PaymentPlan.findById(paymentPlanId);
    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    await sendPaymentPlanEmail({
      student,
      paymentPlan,
      pdfPath: pdfPath || null,
    });

    res.json({ message: 'Ödeme planı emaili gönderildi' });
  } catch (error) {
    console.error('Ödeme planı email hatası:', error);
    res.status(500).json({ message: 'Email gönderilemedi', error: error.message });
  }
});

// POST /api/email/payment-reminder - Ödeme hatırlatma gönder
router.post('/payment-reminder', async (req, res) => {
  try {
    const { studentId, duePayments } = req.body;

    if (!studentId || !duePayments || !Array.isArray(duePayments)) {
      return res.status(400).json({ message: 'StudentId ve duePayments gereklidir' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    if (!student.email) {
      return res.status(400).json({ message: 'Öğrencinin email adresi yok' });
    }

    await sendPaymentReminderEmail({
      student,
      duePayments,
    });

    res.json({ message: 'Ödeme hatırlatma emaili gönderildi' });
  } catch (error) {
    console.error('Ödeme hatırlatma email hatası:', error);
    res.status(500).json({ message: 'Email gönderilemedi', error: error.message });
  }
});

// POST /api/email/welcome - Hoşgeldin emaili gönder
router.post('/welcome', async (req, res) => {
  try {
    const { studentId, courseInfo } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: 'StudentId gereklidir' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    if (!student.email) {
      return res.status(400).json({ message: 'Öğrencinin email adresi yok' });
    }

    await sendWelcomeEmail({
      student,
      course: courseInfo || null,
    });

    res.json({ message: 'Hoşgeldin emaili gönderildi' });
  } catch (error) {
    console.error('Hoşgeldin email hatası:', error);
    res.status(500).json({ message: 'Email gönderilemedi', error: error.message });
  }
});

// POST /api/email/trial-lesson-reminder - Deneme dersi hatırlatma gönder
router.post('/trial-lesson-reminder', async (req, res) => {
  try {
    const { trialLessonId } = req.body;

    if (!trialLessonId) {
      return res.status(400).json({ message: 'TrialLessonId gereklidir' });
    }

    const trialLesson = await TrialLesson.findById(trialLessonId)
      .populate('student')
      .populate('course');

    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }

    if (!trialLesson.student.email) {
      return res.status(400).json({ message: 'Öğrencinin email adresi yok' });
    }

    await sendTrialLessonReminderEmail({
      trialStudent: trialLesson.student,
      lesson: {
        date: trialLesson.date,
        time: trialLesson.time,
        location: trialLesson.location,
        instructor: trialLesson.instructor,
      },
    });

    res.json({ message: 'Deneme dersi hatırlatma emaili gönderildi' });
  } catch (error) {
    console.error('Deneme dersi hatırlatma email hatası:', error);
    res.status(500).json({ message: 'Email gönderilemedi', error: error.message });
  }
});

// POST /api/email/bulk - Toplu email gönder
router.post('/bulk', upload.array('attachments', 5), async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;

    if (!recipients || !subject || !message) {
      return res.status(400).json({ message: 'Recipients, subject ve message gereklidir' });
    }

    // Parse recipients if it's a JSON string
    const recipientList = typeof recipients === 'string' ? JSON.parse(recipients) : recipients;

    if (!Array.isArray(recipientList) || recipientList.length === 0) {
      return res.status(400).json({ message: 'En az bir alıcı gereklidir' });
    }

    const attachments = req.files
      ? req.files.map((file) => ({
          filename: file.originalname,
          path: file.path,
        }))
      : [];

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Send emails sequentially to avoid rate limiting
    for (const recipient of recipientList) {
      try {
        await sendCustomEmail({
          to: recipient.email,
          subject,
          message,
          studentName: recipient.name,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error.message,
        });
      }
    }

    // Clean up uploaded files after sending
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      });
    }

    res.json({
      message: 'Toplu email gönderimi tamamlandı',
      results,
    });
  } catch (error) {
    console.error('Toplu email gönderme hatası:', error);
    res.status(500).json({ message: 'Email gönderilemedi', error: error.message });
  }
});

// GET /api/email/test - Email bağlantısını test et
router.get('/test', async (req, res) => {
  try {
    const testEmail = req.query.email;

    if (!testEmail) {
      return res.status(400).json({ message: 'Test email adresi gereklidir' });
    }

    await sendEmail({
      to: testEmail,
      subject: 'Fofora Tiyatro - Email Test',
      html: '<h1>Email bağlantısı çalışıyor!</h1><p>Bu bir test mesajıdır.</p>',
    });

    res.json({ message: 'Test emaili başarıyla gönderildi' });
  } catch (error) {
    console.error('Test email hatası:', error);
    res.status(500).json({ message: 'Test emaili gönderilemedi', error: error.message });
  }
});

module.exports = router;
