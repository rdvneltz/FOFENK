const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
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
