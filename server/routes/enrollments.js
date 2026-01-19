const express = require('express');
const router = express.Router();
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const ActivityLog = require('../models/ActivityLog');

// Get all enrollments with filtering
router.get('/', async (req, res) => {
  try {
    const { studentId, courseId, isActive, excludeInactiveStudents } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (studentId) filter.student = studentId;
    if (courseId) filter.course = courseId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    let enrollments = await StudentCourseEnrollment.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId phone email parentContacts defaultNotificationRecipient status isArchived')
      .populate({
        path: 'course',
        select: 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth instructor',
        populate: { path: 'instructor', select: 'firstName lastName phone email' }
      })
      .sort({ enrollmentDate: -1 });

    // Filter out enrollments for archived or passive students if requested
    if (excludeInactiveStudents === 'true') {
      enrollments = enrollments.filter(e => {
        // Skip if student not populated
        if (!e.student) return false;

        // Exclude archived students (check for any truthy value)
        if (e.student.isArchived) return false;

        // Exclude passive students
        if (e.student.status === 'passive') return false;

        return true;
      });
    }

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get enrollment by ID
router.get('/:id', async (req, res) => {
  try {
    const enrollment = await StudentCourseEnrollment.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId email phone')
      .populate({
        path: 'course',
        select: 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth instructor',
        populate: { path: 'instructor', select: 'firstName lastName phone email' }
      });

    if (!enrollment) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }
    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create enrollment
router.post('/', async (req, res) => {
  try {
    const enrollment = new StudentCourseEnrollment(req.body);
    const newEnrollment = await enrollment.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'StudentCourseEnrollment',
      entityId: newEnrollment._id,
      description: `Yeni kayıt oluşturuldu`,
      institution: newEnrollment.institution,
      season: newEnrollment.season
    });

    const populatedEnrollment = await StudentCourseEnrollment.findById(newEnrollment._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName studentId')
      .populate({
        path: 'course',
        select: 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth instructor',
        populate: { path: 'instructor', select: 'firstName lastName phone email' }
      });

    res.status(201).json(populatedEnrollment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update enrollment
router.put('/:id', async (req, res) => {
  try {
    const enrollment = await StudentCourseEnrollment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name')
     .populate('season', 'name startDate endDate')
     .populate('student', 'firstName lastName studentId')
     .populate({
       path: 'course',
       select: 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth instructor',
       populate: { path: 'instructor', select: 'firstName lastName phone email' }
     });

    if (!enrollment) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'StudentCourseEnrollment',
      entityId: enrollment._id,
      description: `Kayıt güncellendi`,
      institution: enrollment.institution._id,
      season: enrollment.season._id
    });

    res.json(enrollment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete enrollment
router.delete('/:id', async (req, res) => {
  try {
    const enrollment = await StudentCourseEnrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }

    await StudentCourseEnrollment.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'StudentCourseEnrollment',
      entityId: enrollment._id,
      description: `Kayıt silindi`,
      institution: enrollment.institution,
      season: enrollment.season
    });

    res.json({ message: 'Kayıt silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk enroll students to a course
router.post('/bulk', async (req, res) => {
  try {
    const { courseId, studentIds, enrollmentDate, discount, customPrice, institution, season, createdBy } = req.body;

    if (!courseId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Course ID and student IDs are required' });
    }

    const enrollments = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        // Check if enrollment already exists
        const existingEnrollment = await StudentCourseEnrollment.findOne({
          student: studentId,
          course: courseId,
          season: season,
          isActive: true
        });

        if (existingEnrollment) {
          errors.push({ studentId, message: 'Öğrenci zaten bu derse kayıtlı' });
          continue;
        }

        // Create new enrollment
        const enrollment = new StudentCourseEnrollment({
          student: studentId,
          course: courseId,
          enrollmentDate: enrollmentDate || new Date(),
          discount: discount || { type: 'none', value: 0 },
          customPrice: customPrice || undefined,
          institution,
          season,
          isActive: true,
          createdBy: createdBy || 'System'
        });

        const savedEnrollment = await enrollment.save();
        enrollments.push(savedEnrollment);

        // Log activity
        await ActivityLog.create({
          user: createdBy || 'System',
          action: 'create',
          entity: 'StudentCourseEnrollment',
          entityId: savedEnrollment._id,
          description: `Toplu kayıt: Öğrenci derse eklendi`,
          institution,
          season
        });
      } catch (error) {
        errors.push({ studentId, message: error.message });
      }
    }

    // Populate the enrollments
    const populatedEnrollments = await StudentCourseEnrollment.find({
      _id: { $in: enrollments.map(e => e._id) }
    })
      .populate('student', 'firstName lastName studentId')
      .populate({
        path: 'course',
        select: 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth instructor',
        populate: { path: 'instructor', select: 'firstName lastName phone email' }
      });

    res.status(201).json({
      success: true,
      enrolled: populatedEnrollments,
      errors: errors,
      message: `${enrollments.length} öğrenci başarıyla kaydedildi${errors.length > 0 ? `, ${errors.length} hata oluştu` : ''}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
