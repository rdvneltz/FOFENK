const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const CashRegister = require('../models/CashRegister');
const ActivityLog = require('../models/ActivityLog');

// Get all payments with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId, studentId, cashRegisterId, paymentType, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (studentId) filter.student = studentId;
    if (cashRegisterId) filter.cashRegister = cashRegisterId;
    if (paymentType) filter.paymentType = paymentType;

    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate('course', 'name')
      .populate('cashRegister', 'name')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate('course', 'name')
      .populate('cashRegister', 'name');

    if (!payment) {
      return res.status(404).json({ message: 'Ödeme bulunamadı' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create payment
router.post('/', async (req, res) => {
  try {
    const payment = new Payment(req.body);
    const newPayment = await payment.save();

    // Update student balance
    if (newPayment.student) {
      await Student.findByIdAndUpdate(newPayment.student, {
        $inc: { balance: -newPayment.amount }
      });
    }

    // Update cash register balance
    if (newPayment.cashRegister) {
      await CashRegister.findByIdAndUpdate(newPayment.cashRegister, {
        $inc: { balance: newPayment.amount }
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Payment',
      entityId: newPayment._id,
      description: `Yeni ödeme kaydı: ${newPayment.amount} TL (${newPayment.paymentType})`,
      institution: newPayment.institution,
      season: newPayment.season
    });

    const populatedPayment = await Payment.findById(newPayment._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate('course', 'name')
      .populate('cashRegister', 'name');

    res.status(201).json(populatedPayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const oldPayment = await Payment.findById(req.params.id);
    if (!oldPayment) {
      return res.status(404).json({ message: 'Ödeme bulunamadı' });
    }

    // Revert old payment effects
    if (oldPayment.student) {
      await Student.findByIdAndUpdate(oldPayment.student, {
        $inc: { balance: oldPayment.amount }
      });
    }
    if (oldPayment.cashRegister) {
      await CashRegister.findByIdAndUpdate(oldPayment.cashRegister, {
        $inc: { balance: -oldPayment.amount }
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate')
     .populate('student', 'firstName lastName studentId')
     .populate('course', 'name')
     .populate('cashRegister', 'name');

    // Apply new payment effects
    if (payment.student) {
      await Student.findByIdAndUpdate(payment.student, {
        $inc: { balance: -payment.amount }
      });
    }
    if (payment.cashRegister) {
      await CashRegister.findByIdAndUpdate(payment.cashRegister, {
        $inc: { balance: payment.amount }
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Payment',
      entityId: payment._id,
      description: `Ödeme güncellendi: ${payment.amount} TL`,
      institution: payment.institution._id,
      season: payment.season._id
    });

    res.json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Ödeme bulunamadı' });
    }

    // Revert payment effects
    if (payment.student) {
      await Student.findByIdAndUpdate(payment.student, {
        $inc: { balance: payment.amount }
      });
    }
    if (payment.cashRegister) {
      await CashRegister.findByIdAndUpdate(payment.cashRegister, {
        $inc: { balance: -payment.amount }
      });
    }

    await Payment.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Payment',
      entityId: payment._id,
      description: `Ödeme silindi: ${payment.amount} TL`,
      institution: payment.institution,
      season: payment.season
    });

    res.json({ message: 'Ödeme silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
