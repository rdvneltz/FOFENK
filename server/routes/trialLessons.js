const express = require('express');
const router = express.Router();
const TrialLesson = require('../models/TrialLesson');
const ActivityLog = require('../models/ActivityLog');

// Get all trial lessons with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId, status, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (status) filter.status = status;

    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const trialLessons = await TrialLesson.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ scheduledDate: -1 });

    res.json(trialLessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trial lesson by ID
router.get('/:id', async (req, res) => {
  try {
    const trialLesson = await TrialLesson.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }
    res.json(trialLesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create trial lesson
router.post('/', async (req, res) => {
  try {
    const trialLesson = new TrialLesson(req.body);
    const newTrialLesson = await trialLesson.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'TrialLesson',
      entityId: newTrialLesson._id,
      description: `Yeni deneme dersi oluşturuldu: ${newTrialLesson.studentName}`,
      institution: newTrialLesson.institution,
      season: newTrialLesson.season
    });

    const populatedTrialLesson = await TrialLesson.findById(newTrialLesson._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    res.status(201).json(populatedTrialLesson);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update trial lesson
router.put('/:id', async (req, res) => {
  try {
    const trialLesson = await TrialLesson.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate');

    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'TrialLesson',
      entityId: trialLesson._id,
      description: `Deneme dersi güncellendi: ${trialLesson.studentName} - ${trialLesson.status}`,
      institution: trialLesson.institution._id,
      season: trialLesson.season._id
    });

    res.json(trialLesson);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete trial lesson
router.delete('/:id', async (req, res) => {
  try {
    const trialLesson = await TrialLesson.findById(req.params.id);
    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }

    await TrialLesson.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'TrialLesson',
      entityId: trialLesson._id,
      description: `Deneme dersi silindi: ${trialLesson.studentName}`,
      institution: trialLesson.institution,
      season: trialLesson.season
    });

    res.json({ message: 'Deneme dersi silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
