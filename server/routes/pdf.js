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

// Toplu Öğrenci Raporu - Tekli raporla AYNI içerik, letterhead yok
router.get('/bulk-student-report', async (req, res) => {
  const PDFDocument = require('pdfkit');
  const path = require('path');

  try {
    const { institutionId, seasonId } = req.query;

    if (!institutionId) {
      return res.status(400).json({ message: 'Kurum ID gerekli' });
    }

    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    // Get all students
    const studentQuery = { institution: institutionId };
    if (seasonId) studentQuery.season = seasonId;

    const students = await Student.find(studentQuery).sort({ firstName: 1, lastName: 1 }).lean();

    if (students.length === 0) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Set response headers for PDF
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Toplu_Ogrenci_Raporu_${dateStr}.pdf"`);

    // Font paths
    const FONT_REGULAR = path.join(__dirname, '../assets/fonts/NotoSans-Regular.ttf');
    const FONT_BOLD = path.join(__dirname, '../assets/fonts/NotoSans-Bold.ttf');

    // Create single PDF document - stream directly to response
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      autoFirstPage: false // We'll add pages manually
    });

    // Pipe directly to response (memory efficient - no storing in memory)
    doc.pipe(res);

    // Register fonts
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold', FONT_BOLD);

    // Turkey timezone helpers
    const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date();
      const d = new Date(dateStr);
      const adjustedDate = new Date(d.getTime() + TURKEY_OFFSET_MS);
      return new Date(Date.UTC(adjustedDate.getUTCFullYear(), adjustedDate.getUTCMonth(), adjustedDate.getUTCDate(), 12, 0, 0, 0));
    };

    const formatDateTR = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
      const day = adjusted.getUTCDate().toString().padStart(2, '0');
      const month = (adjusted.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = adjusted.getUTCFullYear();
      return `${day}.${month}.${year}`;
    };

    const formatMonthYearTR = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
      const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
      return `${months[adjusted.getUTCMonth()]} ${adjusted.getUTCFullYear()}`;
    };

    const formatCurrency = (amount) => {
      if (amount === null || amount === undefined) return '-';
      return `₺${Math.round(amount).toLocaleString('tr-TR')}`;
    };

    const sideMargin = 40;
    const topMargin = 50;
    const bottomMargin = 60;

    // Helper: Add new page (NO footer)
    const addNewPage = () => {
      doc.addPage();
      doc.y = topMargin;
    };

    // Helper: Check if need new page
    const checkPageBreak = (neededSpace = 100) => {
      if (doc.y > doc.page.height - bottomMargin - neededSpace) {
        addNewPage();
        return true;
      }
      return false;
    };

    // Process each student
    for (let studentIndex = 0; studentIndex < students.length; studentIndex++) {
      const student = students[studentIndex];

      // Always start each student on a new page
      addNewPage();

      // Get payment plans
      const paymentPlansQuery = {
        student: student._id,
        status: { $ne: 'cancelled' }
      };
      if (seasonId) paymentPlansQuery.season = seasonId;

      const paymentPlans = await PaymentPlan.find(paymentPlansQuery)
        .populate('course')
        .populate('enrollment')
        .populate('season')
        .sort({ createdAt: -1 });

      // ===== STUDENT HEADER =====
      doc.fontSize(14).font('Bold')
        .text(`${studentIndex + 1}. ${student.firstName} ${student.lastName}`, sideMargin);
      doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).lineWidth(2).stroke();
      doc.moveDown(0.5);

      // Student info
      doc.fontSize(10).font('Regular');
      if (student.phone) doc.text(`Telefon: ${student.phone}`);
      if (student.email) doc.text(`E-posta: ${student.email}`);
      if (student.parentContacts && student.parentContacts.length > 0) {
        const parent = student.parentContacts[0];
        doc.text(`Veli: ${parent.name || ''} (${parent.relationship || ''}) - ${parent.phone || ''}`);
      }
      doc.moveDown(1);

      // ===== PROCESS PAYMENT PLANS =====
      if (paymentPlans.length === 0) {
        doc.fontSize(10).font('Regular')
          .text('Bu öğrenci için aktif ödeme planı bulunmamaktadır.');
        continue;
      }

      for (const plan of paymentPlans) {
        const course = plan.course;
        if (!course) continue;

        checkPageBreak(200);

        // Course header
        doc.fontSize(11).font('Bold')
          .text(`KURS: ${course.name}`, sideMargin);
        doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).lineWidth(0.5).stroke();
        doc.moveDown(0.3);

        // Get enrollment
        const enrollment = await StudentCourseEnrollment.findOne({
          student: student._id,
          course: course._id
        });

        // Period info
        doc.fontSize(9).font('Regular');
        const periodStart = plan.periodStartDate || enrollment?.enrollmentDate || plan.createdAt;
        const periodEnd = plan.periodEndDate || enrollment?.endDate;

        if (periodStart) {
          doc.text(`Kayit: ${formatDateTR(periodStart)} - ${periodEnd ? formatDateTR(periodEnd) : 'Devam Ediyor'}`);
        }

        // Calculate monthly breakdown
        const startDate = parseDate(periodStart);
        let endDate = periodEnd ? parseDate(periodEnd) : null;
        if (!endDate && plan.season?.endDate) {
          endDate = parseDate(plan.season.endDate);
        }

        let durationMonths;
        if (endDate) {
          durationMonths = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
            (endDate.getUTCMonth() - startDate.getUTCMonth()) + 1;
          if (durationMonths < 1) durationMonths = 1;
        } else {
          const monthlyFee = course.pricePerMonth || 0;
          durationMonths = monthlyFee > 0 ? Math.round(plan.totalAmount / monthlyFee) : 8;
          if (durationMonths < 1) durationMonths = 1;
        }

        // Check if birebir
        const studentSpecificLessons = await ScheduledLesson.find({
          course: course._id,
          student: student._id,
          status: { $ne: 'cancelled' }
        }).select('_id').lean();
        const isBirebir = studentSpecificLessons.length > 0;

        const monthlyFee = course.pricePerMonth || 0;
        const expectedLessonsPerMonth = course.weeklyFrequency ? course.weeklyFrequency * 4 : 4;
        const perLessonFee = course.pricePerLesson || (monthlyFee / expectedLessonsPerMonth);

        // Calculate discount info FIRST
        const planTotal = plan.totalAmount || 0;
        const discountedAmount = plan.discountedAmount !== undefined && plan.discountedAmount !== null
          ? plan.discountedAmount : planTotal;
        const hasDiscount = discountedAmount < planTotal;
        const isFullScholarship = discountedAmount === 0;
        const discountRatio = planTotal > 0 ? discountedAmount / planTotal : 1;
        const discountedMonthlyFee = Math.floor(monthlyFee * discountRatio);
        const discountedPerLessonFee = Math.floor(perLessonFee * discountRatio);

        // Monthly breakdown table
        doc.moveDown(0.5);
        doc.fontSize(9).font('Bold').text('Ders Detaylari:', sideMargin);
        doc.moveDown(0.2);

        const monthNames = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
        let totalLessons = 0;
        let totalDiscountedAmount = 0;

        const tableLeft = sideMargin;
        let tableY = doc.y;

        doc.fontSize(8).font('Bold');
        doc.text('Ay', tableLeft, tableY);
        doc.text('Ders', tableLeft + 100, tableY);
        doc.text('Ucret', tableLeft + 160, tableY);
        doc.moveTo(tableLeft, tableY + 12).lineTo(tableLeft + 280, tableY + 12).stroke();
        tableY += 16;

        doc.font('Regular');
        for (let m = 0; m < durationMonths && m < 12; m++) {
          const monthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + m, 1, 0, 0, 0, 0));
          const monthEnd = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + m + 1, 0, 23, 59, 59));

          let lessonQuery = {
            course: course._id,
            institution: institutionId,
            date: { $gte: monthStart, $lte: monthEnd },
            status: { $ne: 'cancelled' }
          };

          if (isBirebir) {
            lessonQuery.student = student._id;
          } else {
            lessonQuery.$or = [
              { student: student._id },
              { student: null },
              { student: { $exists: false } }
            ];
          }

          const lessons = await ScheduledLesson.find(lessonQuery).lean();
          let lessonCount = lessons.length;

          if (m === 0) {
            lessonCount = lessons.filter(l => parseDate(l.date) >= startDate).length;
          }
          if (m === durationMonths - 1 && endDate) {
            lessonCount = lessons.filter(l => {
              const ld = parseDate(l.date);
              return (m === 0 ? ld >= startDate : true) && ld <= endDate;
            }).length;
          }

          totalLessons += lessonCount;
          const isPartial = (m === 0 || m === durationMonths - 1) && lessonCount < expectedLessonsPerMonth;
          const originalAmount = isBirebir || isPartial ? lessonCount * perLessonFee : monthlyFee;
          const discAmount = isBirebir || isPartial ? lessonCount * discountedPerLessonFee : discountedMonthlyFee;
          totalDiscountedAmount += discAmount;

          const monthName = `${monthNames[monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`;

          if (tableY > doc.page.height - bottomMargin - 30) {
            addNewPage();
            tableY = doc.y;
          }

          doc.fillColor('black').text(monthName, tableLeft, tableY);
          doc.text(`${lessonCount} ders`, tableLeft + 100, tableY);

          // Show price with discount (strikethrough original + green discounted)
          if (hasDiscount && !isFullScholarship) {
            doc.fillColor('gray')
              .text(formatCurrency(originalAmount), tableLeft + 160, tableY, { strike: true, continued: true });
            doc.fillColor('green')
              .text(` ${formatCurrency(discAmount)}`, { strike: false });
            doc.fillColor('black');
          } else {
            doc.text(formatCurrency(discAmount), tableLeft + 160, tableY);
          }
          tableY += 12;
        }

        doc.moveTo(tableLeft, tableY).lineTo(tableLeft + 280, tableY).stroke();
        tableY += 4;
        doc.font('Bold').fillColor('black');
        if (hasDiscount && !isFullScholarship) {
          doc.text(`Toplam: ${totalLessons} ders = `, tableLeft, tableY, { continued: true });
          doc.fillColor('green').text(formatCurrency(totalDiscountedAmount));
          doc.fillColor('black');
        } else {
          doc.text(`Toplam: ${totalLessons} ders = ${formatCurrency(totalDiscountedAmount)}`, tableLeft, tableY);
        }
        doc.y = tableY + 15;

        // Payment summary
        checkPageBreak(80);
        doc.fontSize(10).font('Bold');
        const paidAmount = plan.paidAmount || 0;
        const remaining = discountedAmount - paidAmount;

        if (isFullScholarship) {
          doc.fillColor('green').text('TAM BURSLU - ODEME GEREKMIYOR');
          doc.fillColor('black');
        } else {
          doc.text(`Toplam Tutar: ${formatCurrency(planTotal)}`);
          if (hasDiscount) {
            const discountPercent = Math.round((1 - discountedAmount / planTotal) * 100);
            doc.fillColor('green').text(`%${discountPercent} Indirimli Tutar: ${formatCurrency(discountedAmount)}`);
            doc.fillColor('black');
          }
          doc.text(`Odenen: ${formatCurrency(paidAmount)}`);
          if (remaining > 0) {
            doc.fillColor('red').text(`Kalan Borc: ${formatCurrency(remaining)}`);
            doc.fillColor('black');
          } else {
            doc.fillColor('green').text('ODEME TAMAMLANDI');
            doc.fillColor('black');
          }
        }

        // DETAILED Installments table
        if (plan.installments && plan.installments.length > 0 && !isFullScholarship) {
          checkPageBreak(100);
          doc.moveDown(0.5);
          doc.fontSize(9).font('Bold').text('Odeme Plani:', sideMargin);
          doc.moveDown(0.2);

          let instY = doc.y;
          const instLeft = sideMargin;

          // Table header
          doc.fontSize(8).font('Bold');
          doc.text('Taksit', instLeft, instY);
          doc.text('Vade', instLeft + 50, instY);
          doc.text('Tutar', instLeft + 120, instY);
          doc.text('Durum', instLeft + 180, instY);
          doc.text('Odeme Tarihi', instLeft + 260, instY);
          doc.moveTo(instLeft, instY + 12).lineTo(instLeft + 350, instY + 12).stroke();
          instY += 16;

          doc.font('Regular');
          for (let idx = 0; idx < plan.installments.length; idx++) {
            const inst = plan.installments[idx];

            if (instY > doc.page.height - bottomMargin - 20) {
              addNewPage();
              instY = doc.y;
            }

            const isPaid = inst.isPaid;
            const isOverdue = !isPaid && new Date(inst.dueDate) < new Date();

            doc.fillColor('black').text(`${idx + 1}. Taksit`, instLeft, instY);
            doc.text(formatDateTR(inst.dueDate), instLeft + 50, instY);
            doc.text(formatCurrency(inst.amount), instLeft + 120, instY);

            if (isPaid) {
              doc.fillColor('green').text('ODENDI', instLeft + 180, instY);
              doc.fillColor('black').text(inst.paidDate ? formatDateTR(inst.paidDate) : '-', instLeft + 260, instY);
            } else if (isOverdue) {
              doc.fillColor('red').text('GECIKTI', instLeft + 180, instY);
              doc.fillColor('black').text('-', instLeft + 260, instY);
            } else {
              doc.fillColor('orange').text('BEKLIYOR', instLeft + 180, instY);
              doc.fillColor('black').text('-', instLeft + 260, instY);
            }
            doc.fillColor('black');
            instY += 12;
          }
          doc.y = instY + 5;
        }

        doc.moveDown(0.8);
      }

      // Force garbage collection hint by nullifying large objects
      // (Node.js will clean up when needed)
    }

    // Finalize PDF (NO footer)
    doc.end();

  } catch (error) {
    console.error('Toplu Rapor hatası:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

module.exports = router;
