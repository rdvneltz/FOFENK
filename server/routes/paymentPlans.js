const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const ActivityLog = require('../models/ActivityLog');

// Get all payment plans with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId, studentId } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (studentId) filter.student = studentId;

    const paymentPlans = await PaymentPlan.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName')
      .populate('course', 'name')
      .sort({ createdAt: -1 });

    res.json(paymentPlans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment plan by ID
router.get('/:id', async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName')
      .populate('course', 'name');

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }
    res.json(paymentPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create payment plan
router.post('/', async (req, res) => {
  try {
    const paymentPlan = new PaymentPlan(req.body);
    const newPaymentPlan = await paymentPlan.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'PaymentPlan',
      entityId: newPaymentPlan._id,
      description: `Yeni ödeme planı oluşturuldu: ${newPaymentPlan.name}`,
      institution: newPaymentPlan.institution,
      season: newPaymentPlan.season
    });

    const populatedPaymentPlan = await PaymentPlan.findById(newPaymentPlan._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    res.status(201).json(populatedPaymentPlan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update payment plan
router.put('/:id', async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate');

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `Ödeme planı güncellendi: ${paymentPlan.name}`,
      institution: paymentPlan.institution._id,
      season: paymentPlan.season._id
    });

    res.json(paymentPlan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete payment plan
router.delete('/:id', async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findById(req.params.id);
    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    await PaymentPlan.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `Ödeme planı silindi: ${paymentPlan.name}`,
      institution: paymentPlan.institution,
      season: paymentPlan.season
    });

    res.json({ message: 'Ödeme planı silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
