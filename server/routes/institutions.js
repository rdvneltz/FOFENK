const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const multer = require('multer');

// Multer configuration - store in memory for Base64 conversion
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
});

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
    // First, get the existing institution to preserve logo if not provided
    const existingInstitution = await Institution.findById(req.params.id);
    if (!existingInstitution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    // Prepare update data, preserving logo and letterhead if not explicitly provided
    const updateData = {
      ...req.body,
      updatedBy: req.body.updatedBy
    };

    // Preserve logo if not provided in update (empty string means intentional deletion)
    if (req.body.logo === undefined) {
      updateData.logo = existingInstitution.logo;
    }

    // Preserve letterhead if not provided in update
    if (req.body.letterhead === undefined) {
      updateData.letterhead = existingInstitution.letterhead;
    }

    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      updateData,
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

// Upload logo - stores as Base64 in database for persistence on cloud platforms
router.post('/:id/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenemedi' });
    }

    // Convert to Base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log(`[Logo Upload] Institution: ${institution._id}, File size: ${req.file.size} bytes, MIME: ${mimeType}`);

    institution.logo = dataUrl;
    await institution.save();

    // Verify the save was successful by fetching the institution again
    const savedInstitution = await Institution.findById(req.params.id);
    if (!savedInstitution.logo || !savedInstitution.logo.startsWith('data:')) {
      console.error('[Logo Upload] Logo not saved properly!');
      return res.status(500).json({ message: 'Logo kaydedilemedi' });
    }

    console.log(`[Logo Upload] Success! Logo saved for institution ${institution._id}`);
    res.json({ logo: savedInstitution.logo });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Upload letterhead - stores as Base64 in database for persistence
router.post('/:id/upload-letterhead', upload.single('letterhead'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Kurum bulunamadı' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenemedi' });
    }

    // Convert to Base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    institution.letterhead = dataUrl;
    await institution.save();

    res.json({ letterhead: institution.letterhead });
  } catch (error) {
    console.error('Letterhead upload error:', error);
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
