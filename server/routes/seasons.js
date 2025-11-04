const express = require('express');
const router = express.Router();
const Season = require('../models/Season');
const ActivityLog = require('../models/ActivityLog');

// Get all seasons
router.get('/', async (req, res) => {
  try {
    const { institutionId } = req.query;
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

module.exports = router;
