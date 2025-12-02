const express = require('express');
const router = express.Router();
const TrialLesson = require('../models/TrialLesson');
const Student = require('../models/Student');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const ActivityLog = require('../models/ActivityLog');

// Get all trial lessons with filtering
router.get('/', async (req, res) => {
  try {
    const { institution, season, status, month, year, startDate, endDate } = req.query;
    const filter = {};

    if (institution) filter.institution = institution;
    if (season) filter.season = season;
    if (status) filter.status = status;

    // Filter by month/year for calendar view
    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      filter.scheduledDate = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    }

    // Filter by date range
    if (startDate && endDate) {
      filter.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const trialLessons = await TrialLesson.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName name')
      .populate('student', 'firstName lastName')
      .sort({ scheduledDate: -1 });

    res.json(trialLessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trial lesson by ID
router.get('/:id', async (req, res) => {
  try {
    const trialLesson = await TrialLesson.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName name')
      .populate('student', 'firstName lastName');

    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }
    res.json(trialLesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create trial lesson
router.post('/', async (req, res) => {
  try {
    // Handle date field - convert date string to scheduledDate if needed
    const trialData = { ...req.body };
    if (trialData.date && !trialData.scheduledDate) {
      trialData.scheduledDate = new Date(trialData.date);
      delete trialData.date;
    }
    if (trialData.time && !trialData.scheduledTime) {
      trialData.scheduledTime = trialData.time;
      delete trialData.time;
    }

    // Remove empty instructor field to avoid ObjectId cast error
    if (!trialData.instructor || trialData.instructor === '') {
      delete trialData.instructor;
    }

    const trialLesson = new TrialLesson(trialData);
    const newTrialLesson = await trialLesson.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'TrialLesson',
      entityId: newTrialLesson._id,
      description: `Yeni deneme dersi oluşturuldu: ${newTrialLesson.firstName} ${newTrialLesson.lastName}`,
      institution: newTrialLesson.institution
    });

    const populatedTrialLesson = await TrialLesson.findById(newTrialLesson._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName name');

    res.status(201).json(populatedTrialLesson);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update trial lesson
router.put('/:id', async (req, res) => {
  try {
    // Remove empty instructor field to avoid ObjectId cast error
    const updateData = { ...req.body, updatedAt: Date.now() };
    if (updateData.instructor === '') {
      updateData.$unset = { instructor: 1 };
      delete updateData.instructor;
    }

    const trialLesson = await TrialLesson.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('course', 'name')
      .populate('instructor', 'firstName lastName name')
      .populate('student', 'firstName lastName');

    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'TrialLesson',
      entityId: trialLesson._id,
      description: `Deneme dersi güncellendi: ${trialLesson.firstName} ${trialLesson.lastName} - ${trialLesson.status}`,
      institution: trialLesson.institution._id || trialLesson.institution
    });

    res.json(trialLesson);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Convert trial lesson to student (Kesin Kayıt)
router.post('/:id/convert-to-student', async (req, res) => {
  try {
    const trialLesson = await TrialLesson.findById(req.params.id)
      .populate('course');

    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }

    if (trialLesson.convertedToStudent) {
      return res.status(400).json({ message: 'Bu deneme dersi zaten kayıt olmuş' });
    }

    const {
      // Student data (can override trial lesson data)
      firstName,
      lastName,
      dateOfBirth,
      phone,
      email,
      tcNo,
      address,
      parentContacts,
      emergencyContact,
      healthNotes,
      notes,
      // Enrollment options
      enrollInCourse,
      enrollmentDate,
      createdBy
    } = req.body;

    // Create student
    const studentData = {
      firstName: firstName || trialLesson.firstName,
      lastName: lastName || trialLesson.lastName,
      dateOfBirth: dateOfBirth || trialLesson.dateOfBirth,
      phone: phone || trialLesson.phone,
      email: email || trialLesson.email,
      tcNo,
      address,
      parentContacts: parentContacts || trialLesson.parentContacts,
      emergencyContact,
      healthNotes,
      notes,
      institution: trialLesson.institution,
      season: trialLesson.season,
      status: 'active',
      createdBy: createdBy || 'System'
    };

    const student = new Student(studentData);
    await student.save();

    let enrollment = null;

    // Enroll in course if requested
    if (enrollInCourse !== false) {
      const enrollmentData = {
        student: student._id,
        course: trialLesson.course._id || trialLesson.course,
        enrollmentDate: enrollmentDate || new Date(),
        status: 'active',
        institution: trialLesson.institution,
        season: trialLesson.season,
        createdBy: createdBy || 'System'
      };

      enrollment = new StudentCourseEnrollment(enrollmentData);
      await enrollment.save();
    }

    // Update trial lesson
    trialLesson.convertedToStudent = true;
    trialLesson.student = student._id;
    trialLesson.enrollment = enrollment ? enrollment._id : null;
    trialLesson.status = 'converted';
    trialLesson.updatedBy = createdBy || 'System';
    await trialLesson.save();

    // Log activity
    await ActivityLog.create({
      user: createdBy || 'System',
      action: 'create',
      entity: 'Student',
      entityId: student._id,
      description: `Deneme dersinden kesin kayıt: ${student.firstName} ${student.lastName}`,
      metadata: {
        trialLessonId: trialLesson._id,
        enrollmentId: enrollment ? enrollment._id : null
      },
      institution: trialLesson.institution
    });

    res.json({
      message: 'Öğrenci başarıyla kaydedildi',
      student,
      enrollment,
      trialLesson
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete trial lesson
router.delete('/:id', async (req, res) => {
  try {
    const trialLesson = await TrialLesson.findById(req.params.id);
    if (!trialLesson) {
      return res.status(404).json({ message: 'Deneme dersi bulunamadı' });
    }

    await TrialLesson.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'TrialLesson',
      entityId: trialLesson._id,
      description: `Deneme dersi silindi: ${trialLesson.firstName} ${trialLesson.lastName}`,
      institution: trialLesson.institution
    });

    res.json({ message: 'Deneme dersi silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
