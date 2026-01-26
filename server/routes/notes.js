const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const User = require('../models/User');

// Get all notes visible to the user (owned + shared)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'userId gerekli' });
    }

    const notes = await Note.getVisibleNotes(userId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single note by ID
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('owner', 'fullName username avatarColor')
      .populate('sharedWith', 'fullName username avatarColor');

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new note
router.post('/', async (req, res) => {
  try {
    const { title, content, owner, color, priority, reminderDate, isPinned } = req.body;

    if (!title || !owner) {
      return res.status(400).json({ message: 'Başlık ve owner gerekli' });
    }

    const note = new Note({
      title,
      content,
      owner,
      color,
      priority,
      reminderDate,
      isPinned
    });

    const savedNote = await note.save();

    const populatedNote = await Note.findById(savedNote._id)
      .populate('owner', 'fullName username avatarColor')
      .populate('sharedWith', 'fullName username avatarColor');

    res.status(201).json(populatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update note
router.put('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    // Sadece not sahibi düzenleyebilir
    if (note.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Bu notu düzenleme yetkiniz yok' });
    }

    const { title, content, color, priority, reminderDate, isPinned } = req.body;

    note.title = title || note.title;
    note.content = content !== undefined ? content : note.content;
    note.color = color || note.color;
    note.priority = priority || note.priority;
    note.reminderDate = reminderDate;
    note.isPinned = isPinned !== undefined ? isPinned : note.isPinned;

    const updatedNote = await note.save();

    const populatedNote = await Note.findById(updatedNote._id)
      .populate('owner', 'fullName username avatarColor')
      .populate('sharedWith', 'fullName username avatarColor');

    res.json(populatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    // Sadece not sahibi silebilir
    if (note.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Bu notu silme yetkiniz yok' });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Not silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share note with users
router.post('/:id/share', async (req, res) => {
  try {
    const { userId, shareWithUserIds } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    // Sadece not sahibi paylaşabilir
    if (note.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Bu notu paylaşma yetkiniz yok' });
    }

    // Kullanıcıları doğrula
    const validUsers = await User.find({
      _id: { $in: shareWithUserIds },
      isActive: true
    });

    // Paylaşılan kullanıcıları güncelle
    note.sharedWith = validUsers.map(u => u._id);
    const updatedNote = await note.save();

    const populatedNote = await Note.findById(updatedNote._id)
      .populate('owner', 'fullName username avatarColor')
      .populate('sharedWith', 'fullName username avatarColor');

    res.json(populatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove share from a user
router.delete('/:id/share/:targetUserId', async (req, res) => {
  try {
    const { userId } = req.query;
    const { targetUserId } = req.params;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    // Sadece not sahibi paylaşımı kaldırabilir
    if (note.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    note.sharedWith = note.sharedWith.filter(id => id.toString() !== targetUserId);
    const updatedNote = await note.save();

    const populatedNote = await Note.findById(updatedNote._id)
      .populate('owner', 'fullName username avatarColor')
      .populate('sharedWith', 'fullName username avatarColor');

    res.json(populatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Toggle pin status
router.patch('/:id/pin', async (req, res) => {
  try {
    const { userId } = req.body;
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    // Sadece not sahibi sabitleyebilir
    if (note.owner.toString() !== userId) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    note.isPinned = !note.isPinned;
    const updatedNote = await note.save();

    const populatedNote = await Note.findById(updatedNote._id)
      .populate('owner', 'fullName username avatarColor')
      .populate('sharedWith', 'fullName username avatarColor');

    res.json(populatedNote);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get users available for sharing (for dropdown)
router.get('/users/available', async (req, res) => {
  try {
    const { excludeUserId } = req.query;

    const query = { isActive: true };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const users = await User.find(query)
      .select('fullName username avatarColor')
      .sort({ fullName: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
