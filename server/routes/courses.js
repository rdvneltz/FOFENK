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
    const { courseId, startDate, durationMonths } = req.body;
    const ScheduledLesson = require('../models/ScheduledLesson');

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Ders bulunamadı' });
    }

    const start = new Date(startDate);
    const monthlyDetails = [];
    let hasSchedule = false;

    // Calculate lesson counts for each month
    for (let i = 0; i < durationMonths; i++) {
      // IMPORTANT: Use first day of month, not start date's day
      // This ensures we count ALL lessons in the month, not just from start date's day onwards
      // Example: If start is Nov 21, we want to count Nov 1-30, not Nov 21-Dec 21
      const monthStart = new Date(start.getFullYear(), start.getMonth() + i, 1); // Day 1 of month
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1); // Day 1 of next month

      // Count scheduled lessons in this month
      const lessonCount = await ScheduledLesson.countDocuments({
        course: courseId,
        date: {
          $gte: monthStart,
          $lt: monthEnd
        },
        status: { $ne: 'cancelled' }
      });

      if (lessonCount > 0) {
        hasSchedule = true;
      }

      monthlyDetails.push({
        month: monthStart.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' }),
        monthIndex: i,
        lessonCount: lessonCount,
        monthStart: monthStart,
        monthEnd: monthEnd
      });
    }

    // Calculate pricing details
    const expectedLessonsPerMonth = course.weeklyFrequency * 4; // Assume 4 weeks per month
    const pricePerLesson = course.pricePerLesson || (course.pricePerMonth / expectedLessonsPerMonth);
    const monthlyFee = course.pricePerMonth || (pricePerLesson * expectedLessonsPerMonth);

    // Calculate both pricing scenarios
    let totalByMonthly = 0;
    let totalByPerLesson = 0;

    monthlyDetails.forEach(month => {
      totalByMonthly += monthlyFee;
      totalByPerLesson += (month.lessonCount * pricePerLesson);
    });

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
      pricing: {
        totalByMonthly,
        totalByPerLesson,
        difference: totalByMonthly - totalByPerLesson,
        recommendMonthly: totalByMonthly <= totalByPerLesson
      }
    });
  } catch (error) {
    console.error('Error calculating monthly lessons:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
