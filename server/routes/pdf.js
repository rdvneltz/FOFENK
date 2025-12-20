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
const Season = require('../models/Season');
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
      .populate('enrollment')
      .populate('season')
      .sort({ createdAt: -1 });

    // Build payment plan data with monthly breakdown
    const paymentPlansData = await Promise.all(paymentPlans.map(async (plan) => {
      const course = plan.course;
      if (!course) {
        return {
          paymentPlan: plan.toObject(),
          course: null,
          enrollment: null,
          monthlyBreakdown: [],
          lessonDetails: null
        };
      }

      // Get enrollment
      const enrollment = await StudentCourseEnrollment.findOne({
        student: studentId,
        course: course._id
      });

      // Get enrollment start date
      const enrollmentDate = enrollment?.enrollmentDate || plan.createdAt;

      // Calculate durationMonths from enrollment/season dates (NOT from installments count!)
      // End date priority: enrollment.endDate > season.endDate > fallback 8 months
      let endDate = null;
      if (enrollment?.endDate) {
        endDate = new Date(enrollment.endDate);
      } else if (plan.season?.endDate) {
        endDate = new Date(plan.season.endDate);
      }

      let durationMonths;
      if (endDate) {
        const startDate = new Date(enrollmentDate);
        // Calculate month difference
        durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth()) + 1; // +1 to include both start and end months
        // Ensure minimum 1 month
        if (durationMonths < 1) durationMonths = 1;
      } else {
        // Fallback: estimate from totalAmount and monthlyFee
        const monthlyFee = course.pricePerMonth || 0;
        if (monthlyFee > 0) {
          durationMonths = Math.round(plan.totalAmount / monthlyFee);
          if (durationMonths < 1) durationMonths = 1;
        } else {
          durationMonths = 8; // Last resort fallback
        }
      }

      // Parse date properly - just year-month-day
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        if (typeof dateStr === 'string') {
          const parts = dateStr.split('T')[0].split('-');
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
        }
        const d = new Date(dateStr);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      };

      const startDate = parseDate(enrollmentDate);

      const monthlyBreakdown = [];
      let totalLessons = 0;
      let firstMonthPartial = null;

      // Get course pricing
      const expectedLessonsPerMonth = course.weeklyFrequency ? course.weeklyFrequency * 4 : 4;
      const monthlyFee = course.pricePerMonth || 0;
      const perLessonFee = course.pricePerLesson || (monthlyFee / expectedLessonsPerMonth);

      // Calculate for each month (same logic as courses.js calculate-monthly-lessons)
      for (let i = 0; i < durationMonths; i++) {
        const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1, 0, 0, 0, 0);
        const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, 23, 59, 59);

        // Get lessons for this month
        const lessons = await ScheduledLesson.find({
          course: course._id,
          institution: institution._id,
          date: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'cancelled' }
        });

        const lessonCount = lessons.length;

        // For first month, calculate lessons AFTER enrollment date
        let lessonsAfterEnrollment = lessonCount;
        let lessonsBeforeEnrollment = 0;

        if (i === 0 && enrollmentDate) {
          lessonsBeforeEnrollment = 0;
          lessonsAfterEnrollment = 0;

          for (const lesson of lessons) {
            const lessonDate = parseDate(lesson.date);
            if (lessonDate < startDate) {
              lessonsBeforeEnrollment++;
            } else {
              lessonsAfterEnrollment++;
            }
          }

          // Store partial info if first month has some lessons before enrollment
          if (lessonsBeforeEnrollment > 0 && lessonsAfterEnrollment > 0) {
            firstMonthPartial = {
              totalLessons: lessonCount,
              lessonsBeforeEnrollment,
              lessonsAfterEnrollment
            };
          }
        }

        totalLessons += (i === 0 ? lessonsAfterEnrollment : lessonCount);

        monthlyBreakdown.push({
          monthName: monthStart.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
          lessonCount: lessonCount,
          lessonsAfterEnrollment: i === 0 ? lessonsAfterEnrollment : lessonCount,
          lessonsBeforeEnrollment: i === 0 ? lessonsBeforeEnrollment : 0,
          monthlyFee: monthlyFee,
          perLessonFee: perLessonFee
        });
      }

      // Calculate total by monthly (full month pricing)
      const totalByMonthly = monthlyFee * durationMonths;

      // Calculate total by partial (first month per-lesson, rest monthly)
      let totalByPartialFirst = 0;
      monthlyBreakdown.forEach((month, index) => {
        if (index === 0 && firstMonthPartial) {
          totalByPartialFirst += month.lessonsAfterEnrollment * perLessonFee;
        } else {
          totalByPartialFirst += monthlyFee;
        }
      });

      // Detect if partial pricing was used by comparing stored totalAmount
      const usedPartialPricing = firstMonthPartial &&
        Math.abs(plan.totalAmount - totalByPartialFirst) < Math.abs(plan.totalAmount - totalByMonthly);

      // Update monthlyBreakdown with correct amounts based on pricing choice
      monthlyBreakdown.forEach((month, index) => {
        if (index === 0 && firstMonthPartial && usedPartialPricing) {
          // Partial first month: use per-lesson pricing
          month.lessonCount = month.lessonsAfterEnrollment;
          month.amount = month.lessonsAfterEnrollment * perLessonFee;
          month.isPartial = true;
        } else {
          // Full monthly pricing
          month.amount = monthlyFee;
          month.isPartial = false;
        }
      });

      // Calculate lesson details for summary
      // Per-lesson fee is ALWAYS calculated as: monthly fee / 4 (expected lessons per month)
      // This is true even if actual lesson count varies
      const discountedMonthlyFee = plan.discountedAmount / durationMonths;
      const discountedPerLessonFee = discountedMonthlyFee / expectedLessonsPerMonth;

      const lessonDetails = {
        monthlyFee: monthlyFee,
        perLessonFee: perLessonFee, // = monthlyFee / 4
        totalLessons: totalLessons,
        durationMonths: durationMonths,
        usedPartialPricing: usedPartialPricing,
        firstMonthPartial: firstMonthPartial,
        // After discount: monthly / 4 = per lesson
        discountedMonthlyFee: discountedMonthlyFee,
        discountedPerLessonFee: discountedPerLessonFee
      };

      return {
        paymentPlan: plan.toObject(),
        course: course.toObject(),
        enrollment: enrollment ? enrollment.toObject() : null,
        monthlyBreakdown,
        lessonDetails
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
