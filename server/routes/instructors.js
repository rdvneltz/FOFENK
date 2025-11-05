const express = require('express');
const router = express.Router();
const Instructor = require('../models/Instructor');
const ActivityLog = require('../models/ActivityLog');

// Get all instructors with filtering
router.get('/', async (req, res) => {
  try {
    const { institution, institutionId } = req.query;
    const filter = {};

    // Support both 'institution' and 'institutionId' parameter names
    if (institution) filter.institution = institution;
    if (institutionId) filter.institution = institutionId;

    const instructors = await Instructor.find(filter)
      .populate('institution', 'name')
      .sort({ lastName: 1, firstName: 1 });

    res.json(instructors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get instructor by ID
router.get('/:id', async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id)
      .populate('institution', 'name');

    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }
    res.json(instructor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create instructor
router.post('/', async (req, res) => {
  try {
    const instructor = new Instructor(req.body);
    const newInstructor = await instructor.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'Instructor',
      entityId: newInstructor._id,
      description: `Yeni eğitmen oluşturuldu: ${newInstructor.firstName} ${newInstructor.lastName}`,
      institution: newInstructor.institution
    });

    const populatedInstructor = await Instructor.findById(newInstructor._id)
      .populate('institution', 'name');

    res.status(201).json(populatedInstructor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update instructor
router.put('/:id', async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Instructor',
      entityId: instructor._id,
      description: `Eğitmen güncellendi: ${instructor.firstName} ${instructor.lastName}`,
      institution: instructor.institution._id
    });

    res.json(instructor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete instructor
router.delete('/:id', async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Eğitmen bulunamadı' });
    }

    await Instructor.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Instructor',
      entityId: instructor._id,
      description: `Eğitmen silindi: ${instructor.firstName} ${instructor.lastName}`,
      institution: instructor.institution
    });

    res.json({ message: 'Eğitmen silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
