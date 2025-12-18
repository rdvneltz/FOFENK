const express = require('express');
const router = express.Router();
const RecurringExpense = require('../models/RecurringExpense');
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const ActivityLog = require('../models/ActivityLog');

// Get all recurring expenses
router.get('/', async (req, res) => {
  try {
    const { institution, season, isActive, category } = req.query;
    const filter = {};

    if (institution) filter.institution = institution;
    if (season) filter.season = season;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (category) filter.category = category;

    const recurringExpenses = await RecurringExpense.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('defaultCashRegister', 'name')
      .sort({ title: 1 });

    res.json(recurringExpenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single recurring expense
router.get('/:id', async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('defaultCashRegister', 'name');

    if (!recurringExpense) {
      return res.status(404).json({ message: 'Düzenli gider bulunamadı' });
    }

    res.json(recurringExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create recurring expense
router.post('/', async (req, res) => {
  try {
    const recurringExpense = new RecurringExpense(req.body);
    const savedExpense = await recurringExpense.save();

    // Populate and return
    const populated = await RecurringExpense.findById(savedExpense._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('defaultCashRegister', 'name');

    // Log activity
    await ActivityLog.create({
      user: 'system',
      action: 'create',
      entity: 'RecurringExpense',
      entityId: savedExpense._id,
      description: `Düzenli gider oluşturuldu: ${savedExpense.title}`,
      institution: savedExpense.institution,
      season: savedExpense.season
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update recurring expense
router.put('/:id', async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('defaultCashRegister', 'name');

    if (!recurringExpense) {
      return res.status(404).json({ message: 'Düzenli gider bulunamadı' });
    }

    res.json(recurringExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete recurring expense
router.delete('/:id', async (req, res) => {
  try {
    const recurringExpense = await RecurringExpense.findById(req.params.id);

    if (!recurringExpense) {
      return res.status(404).json({ message: 'Düzenli gider bulunamadı' });
    }

    // Check if there are pending expenses from this recurring expense
    const pendingCount = await Expense.countDocuments({
      recurringExpense: req.params.id,
      status: 'pending'
    });

    if (pendingCount > 0) {
      return res.status(400).json({
        message: `Bu düzenli gidere bağlı ${pendingCount} bekleyen ödeme var. Önce onları silin veya ödeyin.`
      });
    }

    await RecurringExpense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Düzenli gider silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate expenses from recurring expense (for a date range)
router.post('/:id/generate', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const recurringExpense = await RecurringExpense.findById(req.params.id);

    if (!recurringExpense) {
      return res.status(404).json({ message: 'Düzenli gider bulunamadı' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const generatedExpenses = [];

    // Calculate due dates based on frequency
    let currentDate = new Date(start);

    while (currentDate <= end) {
      // Check if expense already exists for this due date
      const existingExpense = await Expense.findOne({
        recurringExpense: recurringExpense._id,
        dueDate: {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
        }
      });

      if (!existingExpense) {
        // Calculate due date
        const dueDay = recurringExpense.dueDayType === 'fixed'
          ? recurringExpense.dueDay
          : recurringExpense.dueDayRangeStart;

        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);

        // Only create if within the recurring expense's active period
        if (dueDate >= recurringExpense.startDate &&
            (!recurringExpense.endDate || dueDate <= recurringExpense.endDate)) {

          const newExpense = await Expense.create({
            category: recurringExpense.category,
            amount: recurringExpense.estimatedAmount,
            estimatedAmount: recurringExpense.estimatedAmount,
            description: `${recurringExpense.title} - ${dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`,
            expenseDate: dueDate,
            dueDate: dueDate,
            status: dueDate < new Date() ? 'overdue' : 'pending',
            recurringExpense: recurringExpense._id,
            isFromRecurring: true,
            institution: recurringExpense.institution,
            season: recurringExpense.season,
            notes: recurringExpense.notes
          });

          generatedExpenses.push(newExpense);
        }
      }

      // Move to next period based on frequency
      if (recurringExpense.frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (recurringExpense.frequency === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3);
      } else if (recurringExpense.frequency === 'yearly') {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    res.json({
      message: `${generatedExpenses.length} gider oluşturuldu`,
      generated: generatedExpenses.length,
      expenses: generatedExpenses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expenses for a recurring expense
router.get('/:id/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find({ recurringExpense: req.params.id })
      .populate('cashRegister', 'name')
      .sort({ dueDate: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pay a pending expense
router.post('/pay/:expenseId', async (req, res) => {
  try {
    const { amount, cashRegisterId, notes, expenseDate } = req.body;

    const expense = await Expense.findById(req.params.expenseId);

    if (!expense) {
      return res.status(404).json({ message: 'Gider bulunamadı' });
    }

    if (expense.status === 'paid') {
      return res.status(400).json({ message: 'Bu gider zaten ödenmiş' });
    }

    // Get cash register
    const cashRegister = await CashRegister.findById(cashRegisterId);
    if (!cashRegister) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }

    // Update expense
    expense.amount = amount;
    expense.cashRegister = cashRegisterId;
    expense.status = 'paid';
    expense.expenseDate = expenseDate || new Date();
    if (notes) expense.notes = notes;
    expense.updatedAt = new Date();

    await expense.save();

    // Deduct from cash register
    cashRegister.balance -= amount;
    await cashRegister.save();

    // Log activity
    await ActivityLog.create({
      user: 'system',
      action: 'expense',
      entity: 'Expense',
      entityId: expense._id,
      description: `Gider ödendi: ${expense.description} - ${amount} TL`,
      institution: expense.institution,
      season: expense.season,
      metadata: {
        amount,
        cashRegister: cashRegister.name
      }
    });

    // Return populated expense
    const populated = await Expense.findById(expense._id)
      .populate('cashRegister', 'name')
      .populate('recurringExpense', 'title');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get pending/upcoming expenses (for dashboard widget)
router.get('/pending/list', async (req, res) => {
  try {
    const { institution, season, days } = req.query;
    const filter = {
      status: { $in: ['pending', 'overdue'] }
    };

    if (institution) filter.institution = institution;
    if (season) filter.season = season;

    // If days specified, limit to that range
    if (days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(days));
      filter.dueDate = { $lte: futureDate };
    }

    const expenses = await Expense.find(filter)
      .populate('recurringExpense', 'title amountType')
      .sort({ dueDate: 1 });

    // Update overdue status
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const expense of expenses) {
      if (expense.status === 'pending' && expense.dueDate < now) {
        expense.status = 'overdue';
        await expense.save();
      }
    }

    // Group by status
    const overdue = expenses.filter(e => e.status === 'overdue');
    const thisWeek = expenses.filter(e => {
      if (e.status !== 'pending') return false;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return e.dueDate <= weekFromNow;
    });
    const upcoming = expenses.filter(e => {
      if (e.status !== 'pending') return false;
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return e.dueDate > weekFromNow;
    });

    res.json({
      overdue,
      thisWeek,
      upcoming,
      totals: {
        overdueCount: overdue.length,
        overdueAmount: overdue.reduce((sum, e) => sum + e.amount, 0),
        thisWeekCount: thisWeek.length,
        thisWeekAmount: thisWeek.reduce((sum, e) => sum + e.amount, 0),
        upcomingCount: upcoming.length,
        upcomingAmount: upcoming.reduce((sum, e) => sum + e.amount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate all pending expenses for all active recurring expenses
router.post('/generate-all', async (req, res) => {
  try {
    const { institution, season, endDate } = req.body;

    const recurringExpenses = await RecurringExpense.find({
      institution,
      season,
      isActive: true
    });

    let totalGenerated = 0;
    const end = new Date(endDate || new Date());
    end.setMonth(end.getMonth() + 1); // Generate for next month too

    for (const recurring of recurringExpenses) {
      const start = recurring.startDate;
      let currentDate = new Date(start);

      while (currentDate <= end) {
        // Check if expense already exists for this period
        const existingExpense = await Expense.findOne({
          recurringExpense: recurring._id,
          dueDate: {
            $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
            $lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          }
        });

        if (!existingExpense) {
          const dueDay = recurring.dueDayType === 'fixed'
            ? recurring.dueDay
            : recurring.dueDayRangeStart;

          const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dueDay);

          if (dueDate >= recurring.startDate &&
              (!recurring.endDate || dueDate <= recurring.endDate)) {

            await Expense.create({
              category: recurring.category,
              amount: recurring.estimatedAmount,
              estimatedAmount: recurring.estimatedAmount,
              description: `${recurring.title} - ${dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`,
              expenseDate: dueDate,
              dueDate: dueDate,
              status: dueDate < new Date() ? 'overdue' : 'pending',
              recurringExpense: recurring._id,
              isFromRecurring: true,
              institution: recurring.institution,
              season: recurring.season,
              notes: recurring.notes
            });

            totalGenerated++;
          }
        }

        // Move to next period
        if (recurring.frequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (recurring.frequency === 'quarterly') {
          currentDate.setMonth(currentDate.getMonth() + 3);
        } else if (recurring.frequency === 'yearly') {
          currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
      }
    }

    res.json({
      message: `${totalGenerated} gider oluşturuldu`,
      generated: totalGenerated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a pending expense
router.delete('/expense/:expenseId', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.expenseId);

    if (!expense) {
      return res.status(404).json({ message: 'Gider bulunamadı' });
    }

    if (expense.status === 'paid') {
      return res.status(400).json({ message: 'Ödenmiş giderler silinemez' });
    }

    await Expense.findByIdAndDelete(req.params.expenseId);

    res.json({ message: 'Gider silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
