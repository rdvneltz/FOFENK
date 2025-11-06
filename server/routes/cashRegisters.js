const express = require('express');
const router = express.Router();
const CashRegister = require('../models/CashRegister');
const ActivityLog = require('../models/ActivityLog');

// Get all cash registers with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;

    const cashRegisters = await CashRegister.find(filter)
      .populate('institution', 'name')
      .sort({ name: 1 });

    res.json(cashRegisters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get cash register by ID
router.get('/:id', async (req, res) => {
  try {
    const cashRegister = await CashRegister.findById(req.params.id)
      .populate('institution', 'name');

    if (!cashRegister) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }
    res.json(cashRegister);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create cash register
router.post('/', async (req, res) => {
  try {
    const cashRegister = new CashRegister(req.body);
    const newCashRegister = await cashRegister.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'CashRegister',
      entityId: newCashRegister._id,
      description: `Yeni kasa oluşturuldu: ${newCashRegister.name}`,
      institution: newCashRegister.institution
    });

    const populatedCashRegister = await CashRegister.findById(newCashRegister._id)
      .populate('institution', 'name');

    res.status(201).json(populatedCashRegister);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update cash register
router.put('/:id', async (req, res) => {
  try {
    const cashRegister = await CashRegister.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!cashRegister) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'CashRegister',
      entityId: cashRegister._id,
      description: `Kasa güncellendi: ${cashRegister.name}`,
      institution: cashRegister.institution._id
    });

    res.json(cashRegister);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete cash register
router.delete('/:id', async (req, res) => {
  try {
    const cashRegister = await CashRegister.findById(req.params.id);
    if (!cashRegister) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }

    await CashRegister.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'CashRegister',
      entityId: cashRegister._id,
      description: `Kasa silindi: ${cashRegister.name}`,
      institution: cashRegister.institution
    });

    res.json({ message: 'Kasa silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Adjust cash register balance manually
router.post('/:id/adjust-balance', async (req, res) => {
  try {
    const { amount, description, type, userId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Geçerli bir tutar giriniz' });
    }

    if (!type || !['add', 'subtract'].includes(type)) {
      return res.status(400).json({ message: 'Geçerli bir işlem tipi seçiniz (add veya subtract)' });
    }

    const cashRegister = await CashRegister.findById(req.params.id);
    if (!cashRegister) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }

    const adjustAmount = type === 'add' ? amount : -amount;
    cashRegister.balance += adjustAmount;
    await cashRegister.save();

    // Log activity
    await ActivityLog.create({
      user: userId || 'System',
      action: 'update',
      entity: 'CashRegister',
      entityId: cashRegister._id,
      description: `Kasa bakiyesi ${type === 'add' ? 'artırıldı' : 'azaltıldı'}: ₺${amount} - ${description || 'Açıklama yok'}`,
      institution: cashRegister.institution
    });

    const populatedCashRegister = await CashRegister.findById(cashRegister._id)
      .populate('institution', 'name');

    res.json(populatedCashRegister);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Transfer money between cash registers
router.post('/transfer', async (req, res) => {
  try {
    const { fromCashRegisterId, toCashRegisterId, amount, description, userId } = req.body;

    if (!fromCashRegisterId || !toCashRegisterId) {
      return res.status(400).json({ message: 'Kaynak ve hedef kasa seçilmelidir' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Geçerli bir tutar giriniz' });
    }

    if (fromCashRegisterId === toCashRegisterId) {
      return res.status(400).json({ message: 'Kaynak ve hedef kasa aynı olamaz' });
    }

    const fromCash = await CashRegister.findById(fromCashRegisterId);
    const toCash = await CashRegister.findById(toCashRegisterId);

    if (!fromCash || !toCash) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }

    if (fromCash.balance < amount) {
      return res.status(400).json({ message: 'Yetersiz bakiye' });
    }

    fromCash.balance -= amount;
    toCash.balance += amount;

    await fromCash.save();
    await toCash.save();

    // Log activity
    await ActivityLog.create({
      user: userId || 'System',
      action: 'update',
      entity: 'CashRegister',
      description: `Virman: ${fromCash.name} → ${toCash.name}: ₺${amount} - ${description || 'Açıklama yok'}`,
      institution: fromCash.institution
    });

    const populatedFromCash = await CashRegister.findById(fromCash._id)
      .populate('institution', 'name');
    const populatedToCash = await CashRegister.findById(toCash._id)
      .populate('institution', 'name');

    res.json({ fromCash: populatedFromCash, toCash: populatedToCash });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
