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
    const { courseId, startDate, durationMonths, enrollmentDate } = req.body;
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

    // Calculate lesson counts for each month
    for (let i = 0; i < durationMonths; i++) {
      const monthStart = new Date(start.getFullYear(), start.getMonth() + i, 1, 0, 0, 0, 0);
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1, 0, 0, 0, 0);

      // Tüm dersleri al ve tarihleri karşılaştır (MongoDB timezone sorunlarını aşmak için)
      const allLessons = await ScheduledLesson.find({
        course: courseId,
        date: {
          $gte: monthStart,
          $lt: monthEnd
        },
        status: { $ne: 'cancelled' }
      }).select('date');

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
      });
    }

    // Calculate pricing details
    const expectedLessonsPerMonth = course.weeklyFrequency * 4;
    const pricePerLesson = course.pricePerLesson || (course.pricePerMonth / expectedLessonsPerMonth);
    const monthlyFee = course.pricePerMonth || (pricePerLesson * expectedLessonsPerMonth);

    // Calculate three pricing scenarios
    let totalByMonthly = 0; // Full monthly fee for all months
    let totalByPerLesson = 0; // Per-lesson pricing based on actual lessons
    let totalByPartialFirst = 0; // Monthly for full months, partial for first month

    monthlyDetails.forEach((month, index) => {
      totalByMonthly += monthlyFee;
      totalByPerLesson += (month.lessonCount * pricePerLesson);

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
      pricing: {
        totalByMonthly,
        totalByPerLesson,
        totalByPartialFirst, // New: monthly with partial first month
        partialFirstMonthFee, // How much for first month if partial
        difference: totalByMonthly - totalByPerLesson,
        recommendMonthly: totalByMonthly <= totalByPerLesson,
        hasPartialOption: firstMonthPartial !== null
      }
    });
  } catch (error) {
    console.error('Error calculating monthly lessons:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
