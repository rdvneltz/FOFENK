const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Get all users
router.get('/', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const query = institutionId ? { institution: institutionId } : {};
    const users = await User.find(query).populate('institution').sort('-createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active users
router.get('/active', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const query = { isActive: true };
    if (institutionId) query.institution = institutionId;

    const users = await User.find(query).select('_id username fullName role avatarColor').sort('fullName');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('institution');
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    const newUser = await user.save();

    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'User',
      entityId: newUser._id,
      description: `Yeni kullanıcı oluşturuldu: ${newUser.fullName}`,
      institution: newUser.institution
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'User',
      entityId: user._id,
      description: `Kullanıcı güncellendi: ${user.fullName}`,
      institution: user.institution
    });

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    await ActivityLog.create({
      user: req.body.deletedBy || 'System',
      action: 'delete',
      entity: 'User',
      entityId: user._id,
      description: `Kullanıcı pasif edildi: ${user.fullName}`,
      institution: user.institution
    });

    res.json({ message: 'Kullanıcı pasif edildi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user activity logs
router.get('/:id/activities', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    const activities = await ActivityLog.find({ user: user.username })
      .sort('-createdAt')
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
