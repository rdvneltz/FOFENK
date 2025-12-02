const express = require('express');
const router = express.Router();
const Season = require('../models/Season');
const ActivityLog = require('../models/ActivityLog');

// Get all seasons
router.get('/', async (req, res) => {
  try {
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const query = institutionId ? { institution: institutionId } : {};
    const seasons = await Season.find(query).populate('institution').sort('-createdAt');
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get season by ID
router.get('/:id', async (req, res) => {
  try {
    const season = await Season.findById(req.params.id).populate('institution');
    if (!season) {
      return res.status(404).json({ message: 'Sezon bulunamadı' });
    }
    res.json(season);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create season
router.post('/', async (req, res) => {
  try {
    const season = new Season(req.body);
    const newSeason = await season.save();

    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Season',
      entityId: newSeason._id,
      description: `Yeni sezon oluşturuldu: ${newSeason.name}`,
      institution: newSeason.institution
    });

    res.status(201).json(newSeason);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update season
router.put('/:id', async (req, res) => {
  try {
    const season = await Season.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    );

    if (!season) {
      return res.status(404).json({ message: 'Sezon bulunamadı' });
    }

    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Season',
      entityId: season._id,
      description: `Sezon güncellendi: ${season.name}`,
      institution: season.institution
    });

    res.json(season);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Toggle season active status
router.put('/:id/toggle-active', async (req, res) => {
  try {
    const season = await Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ message: 'Sezon bulunamadı' });
    }

    season.isActive = !season.isActive;
    await season.save();

    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Season',
      entityId: season._id,
      description: `Sezon ${season.isActive ? 'aktif' : 'pasif'} edildi: ${season.name}`,
      institution: season.institution
    });

    res.json(season);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete season
router.delete('/:id', async (req, res) => {
  try {
    const season = await Season.findByIdAndDelete(req.params.id);
    if (!season) {
      return res.status(404).json({ message: 'Sezon bulunamadı' });
    }
    res.json({ message: 'Sezon silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Copy data from another season
router.post('/:id/copy-data', async (req, res) => {
  try {
    const targetSeasonId = req.params.id;
    const { sourceSeasonId, dataTypes } = req.body;

    // Import models
    const Student = require('../models/Student');
    const Course = require('../models/Course');
    const MessageTemplate = require('../models/MessageTemplate');

    const results = {};

    if (dataTypes.includes('students')) {
      const students = await Student.find({ season: sourceSeasonId });
      const copied = await Promise.all(
        students.map(async (s) => {
          const studentObj = s.toObject();
          delete studentObj._id;
          delete studentObj.__v;
          const newStudent = new Student({
            ...studentObj,
            season: targetSeasonId,
            balance: 0, // Reset balance for new season
            createdAt: new Date()
          });
          return await newStudent.save();
        })
      );
      results.students = copied.length;
    }

    if (dataTypes.includes('courses')) {
      const courses = await Course.find({ season: sourceSeasonId });
      const copied = await Promise.all(
        courses.map(async (c) => {
          const courseObj = c.toObject();
          delete courseObj._id;
          delete courseObj.__v;
          const newCourse = new Course({
            ...courseObj,
            season: targetSeasonId,
            createdAt: new Date()
          });
          return await newCourse.save();
        })
      );
      results.courses = copied.length;
    }

    if (dataTypes.includes('instructors')) {
      // Instructors are not season-specific, just note
      results.instructors = 'Eğitmenler sezonlar arası paylaşılıyor';
    }

    if (dataTypes.includes('messageTemplates')) {
      const templates = await MessageTemplate.find({ season: sourceSeasonId });
      const copied = await Promise.all(
        templates.map(async (t) => {
          const templateObj = t.toObject();
          delete templateObj._id;
          delete templateObj.__v;
          const newTemplate = new MessageTemplate({
            ...templateObj,
            season: targetSeasonId,
            createdAt: new Date()
          });
          return await newTemplate.save();
        })
      );
      results.messageTemplates = copied.length;
    }

    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'copy',
      entity: 'Season',
      entityId: targetSeasonId,
      description: `Sezonlar arası veri kopyalandı (${dataTypes.join(', ')})`,
      institution: req.body.institution
    });

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
