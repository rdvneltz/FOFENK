const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const ActivityLog = require('../models/ActivityLog');

// Get all expenses with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId, categoryId, cashRegisterId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (categoryId) filter.category = categoryId;
    if (cashRegisterId) filter.cashRegister = cashRegisterId;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const expenses = await Expense.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('category', 'name')
      .populate('cashRegister', 'name')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expense by ID
router.get('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('category', 'name')
      .populate('cashRegister', 'name');

    if (!expense) {
      return res.status(404).json({ message: 'Gider bulunamadı' });
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create expense
router.post('/', async (req, res) => {
  try {
    // Validate foreign keys
    if (req.body.cashRegister) {
      const cashRegisterExists = await CashRegister.exists({ _id: req.body.cashRegister });
      if (!cashRegisterExists) {
        return res.status(404).json({ message: 'Kasa bulunamadı' });
      }
    }

    if (req.body.instructor) {
      const Instructor = require('../models/Instructor');
      const instructorExists = await Instructor.exists({ _id: req.body.instructor });
      if (!instructorExists) {
        return res.status(404).json({ message: 'Eğitmen bulunamadı' });
      }
    }

    const expense = new Expense(req.body);
    const newExpense = await expense.save();

    // Update cash register balance
    if (newExpense.cashRegister) {
      await CashRegister.findByIdAndUpdate(newExpense.cashRegister, {
        $inc: { balance: -newExpense.amount }
      });
    }

    // Update instructor balance if this is an instructor payment
    if (newExpense.instructor && newExpense.category === 'Eğitmen Ödemesi') {
      const Instructor = require('../models/Instructor');
      await Instructor.findByIdAndUpdate(newExpense.instructor, {
        $inc: { balance: -newExpense.amount }
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Expense',
      entityId: newExpense._id,
      description: `Yeni gider kaydı: ${newExpense.amount} TL - ${newExpense.description}`,
      institution: newExpense.institution,
      season: newExpense.season
    });

    const populatedExpense = await Expense.findById(newExpense._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('category', 'name')
      .populate('cashRegister', 'name')
      .populate('instructor', 'firstName lastName');

    res.status(201).json(populatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const oldExpense = await Expense.findById(req.params.id);
    if (!oldExpense) {
      return res.status(404).json({ message: 'Gider bulunamadı' });
    }

    // Revert old expense effects
    if (oldExpense.cashRegister) {
      await CashRegister.findByIdAndUpdate(oldExpense.cashRegister, {
        $inc: { balance: oldExpense.amount }
      });
    }

    // Revert old instructor balance if it was an instructor payment
    if (oldExpense.instructor && oldExpense.category === 'Eğitmen Ödemesi') {
      const Instructor = require('../models/Instructor');
      await Instructor.findByIdAndUpdate(oldExpense.instructor, {
        $inc: { balance: oldExpense.amount }
      });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate')
     .populate('category', 'name')
     .populate('cashRegister', 'name')
     .populate('instructor', 'firstName lastName');

    // Apply new expense effects
    if (expense.cashRegister) {
      await CashRegister.findByIdAndUpdate(expense.cashRegister, {
        $inc: { balance: -expense.amount }
      });
    }

    // Update new instructor balance if this is an instructor payment
    if (expense.instructor && expense.category === 'Eğitmen Ödemesi') {
      const Instructor = require('../models/Instructor');
      await Instructor.findByIdAndUpdate(expense.instructor, {
        $inc: { balance: -expense.amount }
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Expense',
      entityId: expense._id,
      description: `Gider güncellendi: ${expense.amount} TL - ${expense.description}`,
      institution: expense.institution._id,
      season: expense.season._id
    });

    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Gider bulunamadı' });
    }

    // Revert expense effects
    if (expense.cashRegister) {
      await CashRegister.findByIdAndUpdate(expense.cashRegister, {
        $inc: { balance: expense.amount }
      });
    }

    // Revert instructor balance if this was an instructor payment
    if (expense.instructor && expense.category === 'Eğitmen Ödemesi') {
      const Instructor = require('../models/Instructor');
      await Instructor.findByIdAndUpdate(expense.instructor, {
        $inc: { balance: expense.amount }
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Expense',
      entityId: expense._id,
      description: `Gider silindi: ${expense.amount} TL - ${expense.description}`,
      institution: expense.institution,
      season: expense.season
    });

    res.json({ message: 'Gider silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
