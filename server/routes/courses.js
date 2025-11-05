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

    res.json(courses);
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

module.exports = router;
