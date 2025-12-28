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
const { generatePaymentPlanPDF, generateStudentStatusReportPDF, generateAttendanceHistoryPDF, generateBulkStudentReportPDF } = require('../utils/pdfGenerator');
const Attendance = require('../models/Attendance');

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

      // Get period dates from payment plan first, then fall back to enrollment/season dates
      // Priority: plan.periodStartDate > enrollment.enrollmentDate > plan.createdAt
      let enrollmentDate;
      if (plan.periodStartDate) {
        enrollmentDate = plan.periodStartDate;
      } else if (enrollment?.enrollmentDate) {
        enrollmentDate = enrollment.enrollmentDate;
      } else {
        enrollmentDate = plan.createdAt;
      }

      // Turkey timezone offset (UTC+3) - needed because dates stored in MongoDB
      // as UTC need to be adjusted. "Nov 1 midnight Turkey" = "Oct 31 21:00 UTC"
      const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

      // Parse date with Turkey timezone adjustment
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        const d = new Date(dateStr);
        // Add Turkey timezone offset to get the original local date
        const adjustedDate = new Date(d.getTime() + TURKEY_OFFSET_MS);
        // Return date at noon UTC to avoid edge cases
        return new Date(Date.UTC(
          adjustedDate.getUTCFullYear(),
          adjustedDate.getUTCMonth(),
          adjustedDate.getUTCDate(),
          12, 0, 0, 0
        ));
      };

      // Helper to format date in Turkish format
      const formatDateTR = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        // Add Turkey offset for display
        const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
        const day = adjusted.getUTCDate().toString().padStart(2, '0');
        const month = (adjusted.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = adjusted.getUTCFullYear();
        return `${day}.${month}.${year}`;
      };

      // Helper to format month name in Turkish
      const formatMonthTR = (date) => {
        if (!date) return 'N/A';
        const d = new Date(date);
        // Add Turkey offset for display
        const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        return `${months[adjusted.getUTCMonth()]} ${adjusted.getUTCFullYear()}`;
      };

      // Calculate durationMonths from period dates (NOT from installments count!)
      // End date priority: plan.periodEndDate > enrollment.endDate > season.endDate > fallback
      let endDate = null;
      if (plan.periodEndDate) {
        endDate = parseDate(plan.periodEndDate);
      } else if (enrollment?.endDate) {
        endDate = parseDate(enrollment.endDate);
      } else if (plan.season?.endDate) {
        endDate = parseDate(plan.season.endDate);
      }

      let durationMonths;
      if (endDate) {
        const startDateParsed = parseDate(enrollmentDate);
        // Calculate month difference using UTC methods (dates are already adjusted)
        durationMonths = (endDate.getUTCFullYear() - startDateParsed.getUTCFullYear()) * 12 +
          (endDate.getUTCMonth() - startDateParsed.getUTCMonth()) + 1; // +1 to include both start and end months
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

      const startDate = parseDate(enrollmentDate);

      const monthlyBreakdown = [];
      let totalLessons = 0;
      let firstMonthPartial = null;

      // Get course pricing
      const expectedLessonsPerMonth = course.weeklyFrequency ? course.weeklyFrequency * 4 : 4;
      const monthlyFee = course.pricePerMonth || 0;
      const perLessonFee = course.pricePerLesson || (monthlyFee / expectedLessonsPerMonth);

      // Check if this is a birebir (one-on-one) course for this student
      // Birebir: lessons are specifically assigned to this student
      const studentSpecificLessons = await ScheduledLesson.find({
        course: course._id,
        student: studentId,
        status: { $ne: 'cancelled' }
      }).select('_id');
      const isBirebir = studentSpecificLessons.length > 0;

      // Parse period end date for last month filtering
      const periodEndParsed = endDate ? parseDate(endDate) : null;
      let lastMonthPartial = null;

      // Calculate for each month (same logic as courses.js calculate-monthly-lessons)
      for (let i = 0; i < durationMonths; i++) {
        const monthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i + 1, 0, 23, 59, 59));

        // Get lessons for this month
        // For birebir (one-on-one) courses: only count lessons assigned to this student
        // For group courses: count lessons with no student assigned (shared by all)
        let lessonQuery = {
          course: course._id,
          institution: institution._id,
          date: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'cancelled' }
        };

        if (isBirebir) {
          // Birebir: only count lessons assigned to this specific student
          lessonQuery.student = studentId;
        } else {
          // Group course: count lessons with no student assigned
          lessonQuery.$or = [
            { student: studentId },           // Lessons specifically for this student (birebir)
            { student: null },                // Group lessons (no student assigned)
            { student: { $exists: false } }   // Legacy lessons without student field
          ];
        }

        const lessons = await ScheduledLesson.find(lessonQuery);

        let lessonCount = lessons.length;

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

        // For last month, calculate lessons BEFORE or ON periodEndDate
        let lessonsInPeriod = (i === 0) ? lessonsAfterEnrollment : lessonCount;
        let lessonsAfterPeriod = 0;

        if (i === durationMonths - 1 && periodEndParsed) {
          lessonsInPeriod = 0;
          lessonsAfterPeriod = 0;

          for (const lesson of lessons) {
            const lessonDate = parseDate(lesson.date);
            // First month already filtered by enrollment, use that count
            if (i === 0 && lessonDate < startDate) {
              continue; // Skip lessons before enrollment
            }
            if (lessonDate <= periodEndParsed) {
              lessonsInPeriod++;
            } else {
              lessonsAfterPeriod++;
            }
          }

          // Store partial info if last month has some lessons after period end
          if (lessonsAfterPeriod > 0) {
            lastMonthPartial = {
              totalLessons: lessonCount,
              lessonsInPeriod,
              lessonsAfterPeriod,
              periodEndDate: formatDateTR(periodEndParsed)
            };
          }
        }

        // Effective lesson count for this month (respecting period boundaries)
        const effectiveLessonCount = (i === durationMonths - 1 && lastMonthPartial)
          ? lessonsInPeriod
          : ((i === 0) ? lessonsAfterEnrollment : lessonCount);

        totalLessons += effectiveLessonCount;

        // Month name using UTC
        const monthNames = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
                            'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
        const monthName = `${monthNames[monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`;

        monthlyBreakdown.push({
          monthName: monthName,
          lessonCount: effectiveLessonCount, // Use effective count (respecting period boundaries)
          totalMonthLessons: lessonCount, // Total lessons in the calendar month
          lessonsAfterEnrollment: i === 0 ? lessonsAfterEnrollment : lessonCount,
          lessonsBeforeEnrollment: i === 0 ? lessonsBeforeEnrollment : 0,
          lessonsInPeriod: (i === durationMonths - 1 && lastMonthPartial) ? lessonsInPeriod : effectiveLessonCount,
          lessonsAfterPeriod: (i === durationMonths - 1) ? lessonsAfterPeriod : 0,
          isFirstMonthPartial: i === 0 && firstMonthPartial !== null,
          isLastMonthPartial: i === durationMonths - 1 && lastMonthPartial !== null,
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
        if (isBirebir) {
          // Birebir courses: always use per-lesson pricing
          month.amount = month.lessonCount * perLessonFee;
          month.isPartial = false;
          month.isBirebir = true;
        } else if (month.isFirstMonthPartial && usedPartialPricing) {
          // Partial first month: use per-lesson pricing
          month.amount = month.lessonCount * perLessonFee;
          month.isPartial = true;
        } else if (month.isLastMonthPartial) {
          // Partial last month: use per-lesson pricing for lessons within period
          month.amount = month.lessonCount * perLessonFee;
          month.isPartial = true;
        } else {
          // Full monthly pricing
          month.amount = monthlyFee;
          month.isPartial = false;
        }
      });

      // Calculate lesson details for summary
      // Discount ratio is applied to monthly fee, then per-lesson is monthly/4
      const discountRatio = plan.totalAmount > 0 ? plan.discountedAmount / plan.totalAmount : 1;
      const hasDiscount = plan.discountedAmount < plan.totalAmount;

      // Use FLOOR for discounted amounts to avoid overcharging
      const discountedMonthlyFee = Math.floor(monthlyFee * discountRatio);
      const discountedPerLessonFee = Math.floor(discountedMonthlyFee / expectedLessonsPerMonth);

      // Calculate discounted amounts for each month and track the total
      let calculatedDiscountedTotal = 0;
      monthlyBreakdown.forEach((month, index) => {
        if (month.isPartial) {
          // Partial month: lessons × discounted per-lesson fee
          month.discountedAmount = month.lessonCount * discountedPerLessonFee;
        } else {
          // Full month: discounted monthly fee
          month.discountedAmount = discountedMonthlyFee;
        }
        calculatedDiscountedTotal += month.discountedAmount;
      });

      // Add rounding difference to the LAST FULL MONTH (not partial)
      // This ensures total exactly matches discountedAmount
      const roundingDifference = plan.discountedAmount - calculatedDiscountedTotal;
      if (hasDiscount && roundingDifference !== 0) {
        // Find last non-partial month
        for (let i = monthlyBreakdown.length - 1; i >= 0; i--) {
          if (!monthlyBreakdown[i].isPartial) {
            monthlyBreakdown[i].discountedAmount += roundingDifference;
            monthlyBreakdown[i].hasRoundingAdjustment = true;
            break;
          }
        }
      }

      const lessonDetails = {
        monthlyFee: monthlyFee,
        perLessonFee: perLessonFee, // = monthlyFee / 4
        totalLessons: totalLessons,
        durationMonths: durationMonths,
        usedPartialPricing: usedPartialPricing,
        firstMonthPartial: firstMonthPartial,
        lastMonthPartial: lastMonthPartial, // Lessons after periodEndDate are excluded
        discountRatio: discountRatio,
        hasDiscount: hasDiscount,
        // After discount: floor to avoid overcharging
        discountedMonthlyFee: discountedMonthlyFee,
        discountedPerLessonFee: discountedPerLessonFee,
        // Birebir course flag
        isBirebir: isBirebir
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

// Yoklama Geçmişi Raporu PDF'i oluştur
router.get('/attendance-history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { institutionId } = req.query;

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

    // Get all attendance records for this student
    const attendanceRecords = await Attendance.find({ student: studentId })
      .populate('student', 'firstName lastName')
      .populate({
        path: 'scheduledLesson',
        populate: [
          { path: 'course', select: 'name' },
          { path: 'institution', select: 'name' },
          { path: 'season', select: 'name startDate endDate' },
          { path: 'instructor', select: 'firstName lastName' }
        ]
      })
      .sort({ 'scheduledLesson.date': -1 });

    // Sort by date descending (in case the populate messes with order)
    attendanceRecords.sort((a, b) => {
      const dateA = new Date(a.scheduledLesson?.date || 0);
      const dateB = new Date(b.scheduledLesson?.date || 0);
      return dateB - dateA;
    });

    // Calculate summary
    const attended = attendanceRecords.filter(a => a.attended).length;
    const total = attendanceRecords.length;
    const absent = total - attended;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    const summary = {
      attended,
      absent,
      total,
      rate
    };

    // PDF dosyası için path
    const pdfDir = path.join(__dirname, '../uploads/pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const filename = `yoklama-gecmisi-${studentId}-${Date.now()}.pdf`;
    const filepath = path.join(pdfDir, filename);

    // Generate PDF
    await generateAttendanceHistoryPDF({
      student: student.toObject(),
      institution: institution.toObject(),
      attendanceRecords: attendanceRecords.map(r => r.toObject()),
      summary,
      letterhead
    }, filepath);

    // Send PDF
    res.download(filepath, `Yoklama_Gecmisi_${student.firstName}_${student.lastName}.pdf`, (err) => {
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
    console.error('Yoklama Geçmişi Raporu oluşturma hatası:', error);
    res.status(500).json({ message: error.message });
  }
});

// Toplu Öğrenci Raporu - Tekli raporla aynı içerik, letterhead yok
router.get('/bulk-student-report', async (req, res) => {
  const archiver = require('archiver');
  const { generateStudentStatusReportPDF } = require('../utils/pdfGenerator');
  const os = require('os');

  try {
    const { institutionId, seasonId } = req.query;

    if (!institutionId) {
      return res.status(400).json({ message: 'Kurum ID gerekli' });
    }

    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    // Get student IDs only first
    const studentQuery = {
      institution: institutionId,
      status: { $in: ['active', 'trial'] }
    };
    if (seasonId) studentQuery.season = seasonId;

    const studentIds = await Student.find(studentQuery).select('_id').lean();

    if (studentIds.length === 0) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Set response headers for ZIP
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Toplu_Raporlar_${dateStr}.zip"`);

    // Create ZIP
    const archive = archiver('zip', { zlib: { level: 1 } });
    archive.pipe(res);

    // Temp directory for PDFs
    const tempDir = os.tmpdir();

    // Process each student ONE AT A TIME (memory efficient)
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i]._id;

      try {
        // Get student
        const student = await Student.findById(studentId);
        if (!student) continue;

        // Get payment plans with full data (same as individual report)
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

        // Build payment plan data (simplified - skip monthly breakdown for memory)
        const paymentPlansData = paymentPlans.map(plan => {
          const course = plan.course;
          return {
            paymentPlan: plan.toObject(),
            course: course ? course.toObject() : null,
            enrollment: plan.enrollment ? plan.enrollment.toObject() : null,
            monthlyBreakdown: [], // Skip for memory
            lessonDetails: null
          };
        });

        // Generate PDF to temp file
        const tempPath = path.join(tempDir, `report_${studentId}_${Date.now()}.pdf`);

        // Use existing PDF generator but WITHOUT letterhead (pass null)
        await generateStudentStatusReportPDF({
          student: student.toObject(),
          institution: institution.toObject(),
          paymentPlans: paymentPlansData,
          letterhead: null // NO letterhead for bulk reports
        }, tempPath);

        // Add to ZIP
        const fileName = `${student.firstName}_${student.lastName}.pdf`.replace(/\s+/g, '_');
        archive.file(tempPath, { name: fileName });

        // Clean up temp file after adding to archive
        setTimeout(() => {
          try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
        }, 1000);

      } catch (err) {
        console.error(`Error processing student ${studentId}:`, err.message);
        // Continue with next student
      }
    }

    // Finalize ZIP
    await archive.finalize();

  } catch (error) {
    console.error('Toplu Rapor hatası:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

module.exports = router;
