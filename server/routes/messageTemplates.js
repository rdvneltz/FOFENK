const express = require('express');
const router = express.Router();
const MessageTemplate = require('../models/MessageTemplate');
const ActivityLog = require('../models/ActivityLog');

// Get all message templates with filtering
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (type) filter.type = type;

    const messageTemplates = await MessageTemplate.find(filter)
      .populate('institution', 'name')
      .sort({ name: 1 });

    res.json(messageTemplates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get message template by ID
router.get('/:id', async (req, res) => {
  try {
    const messageTemplate = await MessageTemplate.findById(req.params.id)
      .populate('institution', 'name');

    if (!messageTemplate) {
      return res.status(404).json({ message: 'Mesaj şablonu bulunamadı' });
    }
    res.json(messageTemplate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create message template
router.post('/', async (req, res) => {
  try {
    const messageTemplate = new MessageTemplate(req.body);
    const newMessageTemplate = await messageTemplate.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'MessageTemplate',
      entityId: newMessageTemplate._id,
      description: `Yeni mesaj şablonu oluşturuldu: ${newMessageTemplate.name}`,
      institution: newMessageTemplate.institution
    });

    const populatedMessageTemplate = await MessageTemplate.findById(newMessageTemplate._id)
      .populate('institution', 'name');

    res.status(201).json(populatedMessageTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update message template
router.put('/:id', async (req, res) => {
  try {
    const messageTemplate = await MessageTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!messageTemplate) {
      return res.status(404).json({ message: 'Mesaj şablonu bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'MessageTemplate',
      entityId: messageTemplate._id,
      description: `Mesaj şablonu güncellendi: ${messageTemplate.name}`,
      institution: messageTemplate.institution._id
    });

    res.json(messageTemplate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete message template
router.delete('/:id', async (req, res) => {
  try {
    const messageTemplate = await MessageTemplate.findById(req.params.id);
    if (!messageTemplate) {
      return res.status(404).json({ message: 'Mesaj şablonu bulunamadı' });
    }

    await MessageTemplate.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'MessageTemplate',
      entityId: messageTemplate._id,
      description: `Mesaj şablonu silindi: ${messageTemplate.name}`,
      institution: messageTemplate.institution
    });

    res.json({ message: 'Mesaj şablonu silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
