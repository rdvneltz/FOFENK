const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');

// Get all settings with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, category } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (category) filter.category = category;

    const settings = await Settings.find(filter)
      .populate('institution', 'name')
      .sort({ category: 1, key: 1 });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get setting by ID
router.get('/:id', async (req, res) => {
  try {
    const setting = await Settings.findById(req.params.id)
      .populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get setting by key
router.get('/key/:key', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const filter = { key: req.params.key };

    if (institutionId) filter.institution = institutionId;

    const setting = await Settings.findOne(filter)
      .populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create setting
router.post('/', async (req, res) => {
  try {
    const setting = new Settings(req.body);
    const newSetting = await setting.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Settings',
      entityId: newSetting._id,
      description: `Yeni ayar oluşturuldu: ${newSetting.key}`,
      institution: newSetting.institution
    });

    const populatedSetting = await Settings.findById(newSetting._id)
      .populate('institution', 'name');

    res.status(201).json(populatedSetting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update setting
router.put('/:id', async (req, res) => {
  try {
    const setting = await Settings.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Settings',
      entityId: setting._id,
      description: `Ayar güncellendi: ${setting.key}`,
      institution: setting.institution._id
    });

    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update setting by key
router.put('/key/:key', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const filter = { key: req.params.key };

    if (institutionId) filter.institution = institutionId;

    const setting = await Settings.findOneAndUpdate(
      filter,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Settings',
      entityId: setting._id,
      description: `Ayar güncellendi: ${setting.key}`,
      institution: setting.institution._id
    });

    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete setting
router.delete('/:id', async (req, res) => {
  try {
    const setting = await Settings.findById(req.params.id);
    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }

    await Settings.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Settings',
      entityId: setting._id,
      description: `Ayar silindi: ${setting.key}`,
      institution: setting.institution
    });

    res.json({ message: 'Ayar silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
