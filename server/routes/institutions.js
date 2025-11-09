const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all institutions
router.get('/', async (req, res) => {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get institution by ID
router.get('/:id', async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }
    res.json(institution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create institution
router.post('/', async (req, res) => {
  try {
    const institution = new Institution(req.body);
    const newInstitution = await institution.save();

    // Create settings for the institution with defaults
    const newSettings = new Settings({
      institution: newInstitution._id,
      vatRate: 10,
      creditCardRates: [
        { installments: 1, rate: 4 },
        { installments: 2, rate: 6.5 },
        { installments: 3, rate: 9 },
        { installments: 4, rate: 11.5 },
        { installments: 5, rate: 14 },
        { installments: 6, rate: 16.5 },
        { installments: 7, rate: 19 },
        { installments: 8, rate: 21.51 },
        { installments: 9, rate: 21.5 },
        { installments: 10, rate: 24 },
        { installments: 11, rate: 26.5 },
        { installments: 12, rate: 29 }
      ],
      createdBy: req.body.createdBy || 'System'
    });
    await newSettings.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Institution',
      entityId: newInstitution._id,
      description: `Yeni kurum oluşturuldu: ${newInstitution.name}`,
      institution: newInstitution._id
    });

    res.status(201).json(newInstitution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update institution
router.put('/:id', async (req, res) => {
  try {
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    );

    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Institution',
      entityId: institution._id,
      description: `Kurum güncellendi: ${institution.name}`,
      institution: institution._id
    });

    res.json(institution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload logo
router.post('/:id/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    institution.logo = req.file.path;
    await institution.save();

    res.json({ logo: institution.logo });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload letterhead
router.post('/:id/upload-letterhead', upload.single('letterhead'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    institution.letterhead = req.file.path;
    await institution.save();

    res.json({ letterhead: institution.letterhead });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete institution
router.delete('/:id', async (req, res) => {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    res.json({ message: 'Kurum silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
