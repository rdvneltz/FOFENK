const express = require('express');
const router = express.Router();
const PlannedInvestment = require('../models/PlannedInvestment');

// Get all planned investments for an institution
router.get('/', async (req, res) => {
  try {
    const { institution, status } = req.query;

    const query = {};
    if (institution) query.institution = institution;
    if (status) query.status = status;

    const investments = await PlannedInvestment.find(query)
      .sort({ priority: -1, targetDate: 1, createdAt: -1 });

    res.json(investments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get summary stats
router.get('/summary', async (req, res) => {
  try {
    const { institution } = req.query;

    const query = { institution };

    // Get all non-cancelled, non-completed investments
    const activeInvestments = await PlannedInvestment.find({
      ...query,
      status: { $in: ['planned', 'approved', 'in_progress'] }
    });

    const totalPlanned = activeInvestments.reduce((sum, inv) => sum + inv.estimatedAmount, 0);
    const count = activeInvestments.length;

    // Group by priority
    const byPriority = {
      urgent: activeInvestments.filter(i => i.priority === 'urgent'),
      high: activeInvestments.filter(i => i.priority === 'high'),
      medium: activeInvestments.filter(i => i.priority === 'medium'),
      low: activeInvestments.filter(i => i.priority === 'low')
    };

    res.json({
      totalPlanned,
      count,
      byPriority: {
        urgent: { count: byPriority.urgent.length, amount: byPriority.urgent.reduce((s, i) => s + i.estimatedAmount, 0) },
        high: { count: byPriority.high.length, amount: byPriority.high.reduce((s, i) => s + i.estimatedAmount, 0) },
        medium: { count: byPriority.medium.length, amount: byPriority.medium.reduce((s, i) => s + i.estimatedAmount, 0) },
        low: { count: byPriority.low.length, amount: byPriority.low.reduce((s, i) => s + i.estimatedAmount, 0) }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single investment
router.get('/:id', async (req, res) => {
  try {
    const investment = await PlannedInvestment.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ message: 'Planlanan yatırım bulunamadı' });
    }
    res.json(investment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new investment
router.post('/', async (req, res) => {
  try {
    const investment = new PlannedInvestment(req.body);
    await investment.save();
    res.status(201).json(investment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update investment
router.put('/:id', async (req, res) => {
  try {
    const investment = await PlannedInvestment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    );

    if (!investment) {
      return res.status(404).json({ message: 'Planlanan yatırım bulunamadı' });
    }

    res.json(investment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete investment
router.delete('/:id', async (req, res) => {
  try {
    const investment = await PlannedInvestment.findByIdAndDelete(req.params.id);
    if (!investment) {
      return res.status(404).json({ message: 'Planlanan yatırım bulunamadı' });
    }
    res.json({ message: 'Planlanan yatırım silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
