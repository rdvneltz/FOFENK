const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');

// Get all courses with filtering
router.get('/', async (req, res) => {
  try {
    const { institution, season, institutionId, seasonId } = req.query;
    const filter = {};

    // Support both 'institution' and 'institutionId' parameter names
    if (institution) filter.institution = institution;
    if (institutionId) filter.institution = institutionId;
    if (season) filter.season = season;
    if (seasonId) filter.season = seasonId;

    const courses = await Course.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ name: 1 });

    // Add enrollment count for each course
    const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
    const Instructor = require('../models/Instructor');

    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await StudentCourseEnrollment.countDocuments({
          course: course._id,
          isActive: true
        });

        // Manually populate instructor if exists
        let instructor = null;
        if (course.instructor) {
          instructor = await Instructor.findById(course.instructor).select('firstName lastName');
        }

        const courseObj = course.toObject();
        return {
          ...courseObj,
          instructor: instructor || courseObj.instructor,
          enrollmentCount
        };
      })
    );

    res.json(coursesWithEnrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    if (!course) {
      return res.status(404).json({ message: 'Kurs bulunamadı' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create course
router.post('/', async (req, res) => {
  try {
    const course = new Course(req.body);
    const newCourse = await course.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Course',
      entityId: newCourse._id,
      description: `Yeni kurs oluşturuldu: ${newCourse.name}`,
      institution: newCourse.institution,
      season: newCourse.season
    });

    const populatedCourse = await Course.findById(newCourse._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    res.status(201).json(populatedCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate');

    if (!course) {
      return res.status(404).json({ message: 'Kurs bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Course',
      entityId: course._id,
      description: `Kurs güncellendi: ${course.name}`,
      institution: course.institution._id,
      season: course.season._id
    });

    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete course
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Kurs bulunamadı' });
    }

    await Course.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Course',
      entityId: course._id,
      description: `Kurs silindi: ${course.name}`,
      institution: course.institution,
      season: course.season
    });

    res.json({ message: 'Kurs silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Calculate monthly lesson details for a course
router.post('/calculate-monthly-lessons', async (req, res) => {
  try {
    const { courseId, studentId, startDate, durationMonths, enrollmentDate } = req.body;
    const ScheduledLesson = require('../models/ScheduledLesson');

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Ders bulunamadı' });
    }

    // Tarihleri doğru şekilde parse et - sadece yıl-ay-gün kullan
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date();
      // String ise (YYYY-MM-DD formatı)
      if (typeof dateStr === 'string') {
        const parts = dateStr.split('T')[0].split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0, 0);
      }
      // Date object ise
      const d = new Date(dateStr);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    };

    const start = parseDate(startDate);
    const enrollment = parseDate(enrollmentDate);
    const monthlyDetails = [];
    let hasSchedule = false;
    let firstMonthPartial = null;

    // First, determine if this is a birebir (one-on-one) course for this student
    // A birebir course has lessons assigned specifically to this student
    let isBirebir = false;
    let birebirLessonsInfo = null;

    if (studentId) {
      // Check if there are any lessons specifically assigned to this student
      const studentSpecificLessons = await ScheduledLesson.find({
        course: courseId,
        student: studentId,
        status: { $ne: 'cancelled' }
      }).select('date').sort({ date: 1 });

      if (studentSpecificLessons.length > 0) {
        isBirebir = true;
        // Get the actual date range from the student's lessons
        const firstLessonDate = new Date(studentSpecificLessons[0].date);
        const lastLessonDate = new Date(studentSpecificLessons[studentSpecificLessons.length - 1].date);

        // Calculate actual months spanned by the lessons
        const actualMonthsSpan = (lastLessonDate.getFullYear() - firstLessonDate.getFullYear()) * 12
          + (lastLessonDate.getMonth() - firstLessonDate.getMonth()) + 1;

        birebirLessonsInfo = {
          totalLessons: studentSpecificLessons.length,
          firstLessonDate: firstLessonDate,
          lastLessonDate: lastLessonDate,
          actualMonthsSpan: actualMonthsSpan,
          lessonDates: studentSpecificLessons.map(l => l.date)
        };
      }
    }

    // Calculate lesson counts for each month
    for (let i = 0; i < durationMonths; i++) {
      const monthStart = new Date(start.getFullYear(), start.getMonth() + i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1, 0, 0, 0, 0);

      // Get lessons - filter by student for birebir (one-on-one) courses
      // For birebir: only count lessons assigned to this specific student
      // For group: count lessons with no student assigned (shared by all)
      const lessonQuery = {
        course: courseId,
        date: {
          $gte: monthStart,
          $lt: monthEnd
        },
        status: { $ne: 'cancelled' }
      };

      // If studentId is provided, filter for this student's lessons OR group lessons
      if (studentId) {
        if (isBirebir) {
          // For birebir courses, only count lessons assigned to this student
          lessonQuery.student = studentId;
        } else {
          lessonQuery.$or = [
            { student: studentId },           // Lessons specifically for this student (birebir)
            { student: null },                // Group lessons (no student assigned)
            { student: { $exists: false } }   // Legacy lessons without student field
          ];
        }
      }

      const allLessons = await ScheduledLesson.find(lessonQuery).select('date');

      const lessonCount = allLessons.length;

      // For first month, also count lessons AFTER enrollment date
      let lessonsAfterEnrollment = lessonCount;
      let lessonsBeforeEnrollment = 0;

      if (i === 0 && enrollmentDate) {
        // Her dersi tek tek kontrol et
        lessonsBeforeEnrollment = 0;
        lessonsAfterEnrollment = 0;

        for (const lesson of allLessons) {
          const lessonDate = parseDate(lesson.date);

          // Kayıt tarihinden önce mi? (kayıt günü dahil değil - o gün öğrenci katılabilir)
          if (lessonDate < enrollment) {
            lessonsBeforeEnrollment++;
          } else {
            // Kayıt günü ve sonrası - öğrenci katılabilir
            lessonsAfterEnrollment++;
          }
        }

        // Store partial pricing info for first month
        if (lessonsBeforeEnrollment > 0 && lessonsAfterEnrollment > 0) {
          firstMonthPartial = {
            totalLessons: lessonCount,
            lessonsBeforeEnrollment: lessonsBeforeEnrollment,
            lessonsAfterEnrollment: lessonsAfterEnrollment,
            enrollmentDate: enrollment.toLocaleDateString('tr-TR')
          };
        }
      }

      if (lessonCount > 0) {
        hasSchedule = true;
      }

      monthlyDetails.push({
        month: monthStart.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' }),
        monthIndex: i,
        lessonCount: lessonCount,
        lessonsAfterEnrollment: i === 0 ? lessonsAfterEnrollment : lessonCount,
        lessonsBeforeEnrollment: i === 0 ? lessonsBeforeEnrollment : 0,
        monthStart: monthStart,
        monthEnd: monthEnd
        // Note: fee will be calculated after pricePerLesson is determined
      });
    }

    // Calculate fee for each month (will be updated after pricing is calculated)

    // Calculate pricing details
    const expectedLessonsPerMonth = course.weeklyFrequency * 4;
    const pricePerLesson = course.pricePerLesson || (course.pricePerMonth / expectedLessonsPerMonth);
    const monthlyFee = course.pricePerMonth || (pricePerLesson * expectedLessonsPerMonth);

    // Calculate three pricing scenarios
    let totalByMonthly = 0; // Full monthly fee for all months
    let totalByPerLesson = 0; // Per-lesson pricing based on actual lessons
    let totalByPartialFirst = 0; // Monthly for full months, partial for first month

    // Add per-lesson fee to each month's details
    monthlyDetails.forEach((month, index) => {
      // Calculate per-lesson fee for this month
      const perLessonFee = month.lessonCount * pricePerLesson;
      month.perLessonFee = perLessonFee;
      month.monthlyFee = monthlyFee;

      totalByMonthly += monthlyFee;
      totalByPerLesson += perLessonFee;

      if (index === 0 && firstMonthPartial) {
        // First month: charge only for lessons after enrollment
        totalByPartialFirst += (month.lessonsAfterEnrollment * pricePerLesson);
      } else {
        // Other months: full monthly fee
        totalByPartialFirst += monthlyFee;
      }
    });

    // Calculate partial first month pricing if applicable
    let partialFirstMonthFee = null;
    if (firstMonthPartial) {
      partialFirstMonthFee = firstMonthPartial.lessonsAfterEnrollment * pricePerLesson;
    }

    res.json({
      course: {
        name: course.name,
        pricingType: course.pricingType,
        pricePerLesson,
        monthlyFee,
        weeklyFrequency: course.weeklyFrequency,
        expectedLessonsPerMonth
      },
      hasSchedule,
      monthlyDetails,
      firstMonthPartial, // Info about partial first month
      // Birebir (one-on-one) course information
      isBirebir,
      birebirLessonsInfo,
      pricing: {
        totalByMonthly,
        totalByPerLesson,
        totalByPartialFirst, // New: monthly with partial first month
        partialFirstMonthFee, // How much for first month if partial
        difference: totalByMonthly - totalByPerLesson,
        recommendMonthly: totalByMonthly <= totalByPerLesson,
        hasPartialOption: firstMonthPartial !== null,
        // For birebir, the recommended total is totalByPerLesson
        recommendedTotal: isBirebir ? totalByPerLesson : totalByMonthly
      }
    });
  } catch (error) {
    console.error('Error calculating monthly lessons:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
