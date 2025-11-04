const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const ActivityLog = require('../models/ActivityLog');

// Get all attendance records with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId, studentId, courseId, scheduledLessonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (studentId) filter.student = studentId;
    if (courseId) filter.course = courseId;
    if (scheduledLessonId) filter.scheduledLesson = scheduledLessonId;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendances = await Attendance.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate('course', 'name')
      .populate('scheduledLesson')
      .sort({ date: -1 });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by ID
router.get('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate('course', 'name')
      .populate('scheduledLesson');

    if (!attendance) {
      return res.status(404).json({ message: 'Yoklama kaydı bulunamadı' });
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create attendance
router.post('/', async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    const newAttendance = await attendance.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Attendance',
      entityId: newAttendance._id,
      description: `Yoklama kaydı oluşturuldu: ${newAttendance.status}`,
      institution: newAttendance.institution,
      season: newAttendance.season
    });

    const populatedAttendance = await Attendance.findById(newAttendance._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate('course', 'name')
      .populate('scheduledLesson');

    res.status(201).json(populatedAttendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk create attendance (for creating multiple attendance records at once)
router.post('/bulk', async (req, res) => {
  try {
    const attendances = await Attendance.insertMany(req.body.attendances);

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Attendance',
      description: `${attendances.length} yoklama kaydı toplu olarak oluşturuldu`,
      institution: req.body.institutionId,
      season: req.body.seasonId
    });

    res.status(201).json(attendances);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update attendance
router.put('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate')
     .populate('student', 'firstName lastName studentId')
     .populate('course', 'name')
     .populate('scheduledLesson');

    if (!attendance) {
      return res.status(404).json({ message: 'Yoklama kaydı bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Attendance',
      entityId: attendance._id,
      description: `Yoklama kaydı güncellendi: ${attendance.status}`,
      institution: attendance.institution._id,
      season: attendance.season._id
    });

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete attendance
router.delete('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Yoklama kaydı bulunamadı' });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Attendance',
      entityId: attendance._id,
      description: `Yoklama kaydı silindi`,
      institution: attendance.institution,
      season: attendance.season
    });

    res.json({ message: 'Yoklama kaydı silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
