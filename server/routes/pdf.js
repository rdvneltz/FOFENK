const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PaymentPlan = require('../models/PaymentPlan');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Institution = require('../models/Institution');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const Settings = require('../models/Settings');
const ScheduledLesson = require('../models/ScheduledLesson');
const { generatePaymentPlanPDF, generateStudentStatusReportPDF } = require('../utils/pdfGenerator');

// Ödeme planı PDF'i oluştur
router.get('/payment-plan/:paymentPlanId', async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findById(req.params.paymentPlanId);
    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    const student = await Student.findById(paymentPlan.student);
    const course = await Course.findById(paymentPlan.course);
    const institution = await Institution.findById(paymentPlan.institution);

    // PDF dosyası için path
    const pdfDir = path.join(__dirname, '../uploads/pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filename = `odeme-plani-${paymentPlan._id}-${Date.now()}.pdf`;
    const filepath = path.join(pdfDir, filename);

    // PDF oluştur
    await generatePaymentPlanPDF(paymentPlan, student, course, institution, filepath);

    // PDF'i gönder
    res.download(filepath, `Odeme_Plani_${student.firstName}_${student.lastName}.pdf`, (err) => {
      if (err) {
        console.error('PDF gönderim hatası:', err);
      }
      // PDF dosyasını sil (isteğe bağlı)
      // fs.unlinkSync(filepath);
    });
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    res.status(500).json({ message: error.message });
  }
});

// Öğrenci Son Durum Raporu PDF'i oluştur
router.get('/student-status-report/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { institutionId, seasonId } = req.query;

    // Get student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Get institution
    const institution = await Institution.findById(institutionId || student.institution);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    // Get settings for letterhead
    const settings = await Settings.findOne({ institution: institution._id });
    const letterhead = settings?.letterhead || null;

    // Get all payment plans for this student
    const paymentPlansQuery = {
      student: studentId,
      status: { $ne: 'cancelled' }
    };
    if (seasonId) paymentPlansQuery.season = seasonId;

    const paymentPlans = await PaymentPlan.find(paymentPlansQuery)
      .populate('course')
      .sort({ createdAt: -1 });

    // Get enrollments for the student
    const enrollments = await StudentCourseEnrollment.find({
      student: studentId,
      status: 'active'
    }).populate('course');

    // Build payment plan data with monthly breakdown
    const paymentPlansData = await Promise.all(paymentPlans.map(async (plan) => {
      const course = plan.course;
      const enrollment = enrollments.find(e => e.course?._id?.toString() === course?._id?.toString());

      // Calculate monthly breakdown
      let monthlyBreakdown = [];

      if (enrollment && plan.monthlyBreakdown && plan.monthlyBreakdown.length > 0) {
        // Use existing monthly breakdown from payment plan
        monthlyBreakdown = plan.monthlyBreakdown.map(mb => ({
          monthName: new Date(mb.year, mb.month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
          lessonCount: mb.lessonCount || 0,
          amount: mb.amount || 0,
          note: mb.isPartialMonth ? `Kısmi ay (ders başı ₺${mb.perLessonRate || 0})` :
                `Aylık ₺${mb.monthlyRate || 0}`
        }));
      } else if (enrollment) {
        // Calculate from scheduled lessons if no monthly breakdown exists
        const startDate = new Date(enrollment.startDate);
        const endDate = enrollment.endDate ? new Date(enrollment.endDate) : new Date();

        // Get scheduled lessons for this course
        const lessons = await ScheduledLesson.find({
          course: course._id,
          institution: institution._id,
          date: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'scheduled'] }
        });

        // Group by month
        const monthGroups = {};
        lessons.forEach(lesson => {
          const date = new Date(lesson.date);
          const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          if (!monthGroups[key]) {
            monthGroups[key] = { lessons: [], year: date.getFullYear(), month: date.getMonth() + 1 };
          }
          monthGroups[key].lessons.push(lesson);
        });

        // Calculate amount per month
        const monthlyRate = enrollment.monthlyFee || course?.monthlyFee || 0;
        const perLessonRate = enrollment.perLessonFee || course?.perLessonFee || monthlyRate / 4;

        Object.values(monthGroups).forEach(group => {
          const monthStart = new Date(group.year, group.month - 1, 1);
          const isPartialMonth = startDate.getFullYear() === group.year &&
                                 startDate.getMonth() + 1 === group.month &&
                                 startDate.getDate() > 1;

          const lessonCount = group.lessons.length;
          let amount, note;

          if (isPartialMonth && lessonCount < 4) {
            amount = lessonCount * perLessonRate;
            note = `Kısmi ay (ders başı ₺${perLessonRate.toLocaleString('tr-TR')})`;
          } else {
            amount = monthlyRate;
            note = `Aylık ₺${monthlyRate.toLocaleString('tr-TR')}`;
          }

          monthlyBreakdown.push({
            monthName: monthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
            lessonCount,
            amount,
            note
          });
        });

        // Sort by date
        monthlyBreakdown.sort((a, b) => {
          const [monthA, yearA] = a.monthName.split(' ');
          const [monthB, yearB] = b.monthName.split(' ');
          return new Date(`${yearA} ${monthA}`) - new Date(`${yearB} ${monthB}`);
        });
      }

      return {
        paymentPlan: plan.toObject(),
        course: course ? course.toObject() : null,
        enrollment: enrollment ? enrollment.toObject() : null,
        monthlyBreakdown
      };
    }));

    // PDF dosyası için path
    const pdfDir = path.join(__dirname, '../uploads/pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filename = `son-durum-raporu-${studentId}-${Date.now()}.pdf`;
    const filepath = path.join(pdfDir, filename);

    // Generate PDF
    await generateStudentStatusReportPDF({
      student: student.toObject(),
      institution: institution.toObject(),
      paymentPlans: paymentPlansData,
      letterhead
    }, filepath);

    // Send PDF
    res.download(filepath, `Son_Durum_Raporu_${student.firstName}_${student.lastName}.pdf`, (err) => {
      if (err) {
        console.error('PDF gönderim hatası:', err);
      }
      // Cleanup after send
      setTimeout(() => {
        try {
          fs.unlinkSync(filepath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 5000);
    });
  } catch (error) {
    console.error('Son Durum Raporu oluşturma hatası:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
