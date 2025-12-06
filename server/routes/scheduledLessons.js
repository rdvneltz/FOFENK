const express = require('express');
const router = express.Router();
const ScheduledLesson = require('../models/ScheduledLesson');
const ActivityLog = require('../models/ActivityLog');
const scheduleGenerator = require('../utils/scheduleGenerator');

// Get all scheduled lessons with filtering
router.get('/', async (req, res) => {
  try {
    const { courseId, instructorId, startDate, endDate, month, year } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (courseId) filter.course = courseId;
    if (instructorId) filter.instructor = instructorId;

    // Month/year filter for calendar view
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      filter.date = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    } else if (startDate && endDate) {
      // Date range filter
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const scheduledLessons = await ScheduledLesson.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName')
      .populate('additionalInstructors.instructor', 'firstName lastName')
      .sort({ date: 1, startTime: 1 });

    res.json(scheduledLessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get scheduled lesson by ID
router.get('/:id', async (req, res) => {
  try {
    const scheduledLesson = await ScheduledLesson.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName email phone paymentType paymentAmount')
      .populate('additionalInstructors.instructor', 'firstName lastName email phone paymentType paymentAmount');

    if (!scheduledLesson) {
      return res.status(404).json({ message: 'Planlanmış ders bulunamadı' });
    }
    res.json(scheduledLesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create scheduled lesson
router.post('/', async (req, res) => {
  try {
    const scheduledLesson = new ScheduledLesson(req.body);
    const newScheduledLesson = await scheduledLesson.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'ScheduledLesson',
      entityId: newScheduledLesson._id,
      description: `Yeni ders planlandı`,
      institution: newScheduledLesson.institution,
      season: newScheduledLesson.season
    });

    const populatedScheduledLesson = await ScheduledLesson.findById(newScheduledLesson._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName')
      .populate('additionalInstructors.instructor', 'firstName lastName');

    res.status(201).json(populatedScheduledLesson);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update scheduled lesson
router.put('/:id', async (req, res) => {
  try {
    const scheduledLesson = await ScheduledLesson.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate')
     .populate('course', 'name')
     .populate('instructor', 'firstName lastName paymentType paymentAmount')
     .populate('additionalInstructors.instructor', 'firstName lastName paymentType paymentAmount');

    if (!scheduledLesson) {
      return res.status(404).json({ message: 'Planlanmış ders bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'ScheduledLesson',
      entityId: scheduledLesson._id,
      description: `Planlanmış ders güncellendi`,
      institution: scheduledLesson.institution._id,
      season: scheduledLesson.season._id
    });

    res.json(scheduledLesson);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete scheduled lesson
router.delete('/:id', async (req, res) => {
  try {
    const scheduledLesson = await ScheduledLesson.findById(req.params.id);
    if (!scheduledLesson) {
      return res.status(404).json({ message: 'Planlanmış ders bulunamadı' });
    }

    await ScheduledLesson.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'ScheduledLesson',
      entityId: scheduledLesson._id,
      description: `Planlanmış ders silindi`,
      institution: scheduledLesson.institution,
      season: scheduledLesson.season
    });

    res.json({ message: 'Planlanmış ders silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate automatic schedule
router.post('/generate-schedule', async (req, res) => {
  try {
    const {
      courseId,
      instructorId,
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
      frequency,
      seasonId,
      institutionId,
      skipHolidays,
      notes,
      createdBy
    } = req.body;

    const result = await scheduleGenerator.generateSchedule({
      courseId,
      instructorId,
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
      frequency,
      seasonId,
      institutionId,
      skipHolidays,
      notes,
      createdBy
    });

    // Log activity
    await ActivityLog.create({
      user: createdBy || 'System',
      action: 'create',
      entity: 'ScheduledLesson',
      description: `Otomatik program oluşturuldu: ${result.count} ders`,
      institution: institutionId,
      season: seasonId
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
