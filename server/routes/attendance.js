const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const ActivityLog = require('../models/ActivityLog');

// Get all attendance records with filtering
router.get('/', async (req, res) => {
  try {
    const { scheduledLessonId, studentId } = req.query;
    const filter = {};

    if (studentId) filter.student = studentId;
    if (scheduledLessonId) filter.scheduledLesson = scheduledLessonId;

    const attendances = await Attendance.find(filter)
      .populate('student', 'firstName lastName studentId')
      .populate({
        path: 'scheduledLesson',
        populate: [
          { path: 'course', select: 'name' },
          { path: 'institution', select: 'name' },
          { path: 'season', select: 'name startDate endDate' },
          { path: 'instructor', select: 'firstName lastName' }
        ]
      })
      .sort({ createdAt: -1 });

    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by ID
router.get('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('student', 'firstName lastName studentId')
      .populate({
        path: 'scheduledLesson',
        populate: [
          { path: 'course', select: 'name' },
          { path: 'institution', select: 'name' },
          { path: 'season', select: 'name startDate endDate' },
          { path: 'instructor', select: 'firstName lastName' }
        ]
      });

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

    const populatedAttendance = await Attendance.findById(newAttendance._id)
      .populate('student', 'firstName lastName studentId')
      .populate({
        path: 'scheduledLesson',
        populate: [
          { path: 'course', select: 'name' },
          { path: 'institution', select: 'name' },
          { path: 'season', select: 'name startDate endDate' },
          { path: 'instructor', select: 'firstName lastName' }
        ]
      });

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Attendance',
      entityId: newAttendance._id,
      description: `Yoklama kaydı oluşturuldu`,
      institution: populatedAttendance.scheduledLesson?.institution?._id,
      season: populatedAttendance.scheduledLesson?.season?._id
    });

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
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({ message: 'Yoklama kaydı bulunamadı' });
    }

    const attendance = await Attendance.findById(updatedAttendance._id)
      .populate('student', 'firstName lastName studentId')
      .populate({
        path: 'scheduledLesson',
        populate: [
          { path: 'course', select: 'name' },
          { path: 'institution', select: 'name' },
          { path: 'season', select: 'name startDate endDate' },
          { path: 'instructor', select: 'firstName lastName' }
        ]
      });

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Attendance',
      entityId: attendance._id,
      description: `Yoklama kaydı güncellendi`,
      institution: attendance.scheduledLesson?.institution?._id,
      season: attendance.scheduledLesson?.season?._id
    });

    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete attendance
router.delete('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate({
        path: 'scheduledLesson',
        select: 'institution season'
      });

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
      institution: attendance.scheduledLesson?.institution,
      season: attendance.scheduledLesson?.season
    });

    res.json({ message: 'Yoklama kaydı silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
