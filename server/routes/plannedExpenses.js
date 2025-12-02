const express = require('express');
const router = express.Router();
const PlannedExpense = require('../models/PlannedExpense');
const ActivityLog = require('../models/ActivityLog');

// Get all planned expenses with filtering
router.get('/', async (req, res) => {
  try {
    const { categoryId } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (categoryId) filter.category = categoryId;

    const plannedExpenses = await PlannedExpense.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('category', 'name')
      .sort({ name: 1 });

    res.json(plannedExpenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get planned expense by ID
router.get('/:id', async (req, res) => {
  try {
    const plannedExpense = await PlannedExpense.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('category', 'name');

    if (!plannedExpense) {
      return res.status(404).json({ message: 'Planlı gider bulunamadı' });
    }
    res.json(plannedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create planned expense
router.post('/', async (req, res) => {
  try {
    const plannedExpense = new PlannedExpense(req.body);
    const newPlannedExpense = await plannedExpense.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'PlannedExpense',
      entityId: newPlannedExpense._id,
      description: `Yeni planlı gider oluşturuldu: ${newPlannedExpense.name}`,
      institution: newPlannedExpense.institution,
      season: newPlannedExpense.season
    });

    const populatedPlannedExpense = await PlannedExpense.findById(newPlannedExpense._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('category', 'name');

    res.status(201).json(populatedPlannedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update planned expense
router.put('/:id', async (req, res) => {
  try {
    const plannedExpense = await PlannedExpense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate')
     .populate('category', 'name');

    if (!plannedExpense) {
      return res.status(404).json({ message: 'Planlı gider bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'PlannedExpense',
      entityId: plannedExpense._id,
      description: `Planlı gider güncellendi: ${plannedExpense.name}`,
      institution: plannedExpense.institution._id,
      season: plannedExpense.season._id
    });

    res.json(plannedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete planned expense
router.delete('/:id', async (req, res) => {
  try {
    const plannedExpense = await PlannedExpense.findById(req.params.id);
    if (!plannedExpense) {
      return res.status(404).json({ message: 'Planlı gider bulunamadı' });
    }

    await PlannedExpense.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'PlannedExpense',
      entityId: plannedExpense._id,
      description: `Planlı gider silindi: ${plannedExpense.name}`,
      institution: plannedExpense.institution,
      season: plannedExpense.season
    });

    res.json({ message: 'Planlı gider silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
