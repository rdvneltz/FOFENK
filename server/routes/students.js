const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');

// Get all students with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;

    // Season filter is required
    if (!seasonId) {
      return res.status(400).json({ message: 'Season parameter is required' });
    }

    const filter = { season: seasonId };
    if (institutionId) filter.institution = institutionId;

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ lastName: 1, firstName: 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create student
router.post('/', async (req, res) => {
  try {
    const student = new Student(req.body);
    const newStudent = await student.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Student',
      entityId: newStudent._id,
      description: `Yeni öğrenci oluşturuldu: ${newStudent.firstName} ${newStudent.lastName}`,
      institution: newStudent.institution,
      season: newStudent.season
    });

    const populatedStudent = await Student.findById(newStudent._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    res.status(201).json(populatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate');

    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci güncellendi: ${student.firstName} ${student.lastName}`,
      institution: student.institution._id,
      season: student.season._id
    });

    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    await Student.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci silindi: ${student.firstName} ${student.lastName}`,
      institution: student.institution,
      season: student.season
    });

    res.json({ message: 'Öğrenci silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
