const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const Student = require('../models/Student');
const Course = require('../models/Course');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const PaymentPlan = require('../models/PaymentPlan');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const Instructor = require('../models/Instructor');
const Season = require('../models/Season');
const Institution = require('../models/Institution');
const ScheduledLesson = require('../models/ScheduledLesson');
const Attendance = require('../models/Attendance');
const TrialLesson = require('../models/TrialLesson');

// Get all settings with filtering
router.get('/', async (req, res) => {
  try {
    const { institutionId, category } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (category) filter.category = category;

    const settings = await Settings.find(filter)
      .populate('institution', 'name')
      .sort({ category: 1, key: 1 });

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get setting by institution ID
router.get('/institution/:institutionId', async (req, res) => {
  try {
    const setting = await Settings.findOne({ institution: req.params.institutionId })
      .populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get setting by ID
router.get('/:id', async (req, res) => {
  try {
    const setting = await Settings.findById(req.params.id)
      .populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get setting by key
router.get('/key/:key', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const filter = { key: req.params.key };

    if (institutionId) filter.institution = institutionId;

    const setting = await Settings.findOne(filter)
      .populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or Update setting (upsert)
router.post('/', async (req, res) => {
  try {
    // Check if settings exist for this institution
    const existingSetting = await Settings.findOne({ institution: req.body.institution });

    let setting;
    let isNew = false;

    if (existingSetting) {
      // Update existing settings
      setting = await Settings.findByIdAndUpdate(
        existingSetting._id,
        { ...req.body, updatedBy: req.body.createdBy || req.body.updatedBy },
        { new: true }
      ).populate('institution', 'name');

      // Log activity
      await ActivityLog.create({
        user: req.body.createdBy || req.body.updatedBy || 'System',
        action: 'update',
        entity: 'Settings',
        entityId: setting._id,
        description: 'Ayarlar güncellendi',
        institution: setting.institution._id
      });
    } else {
      // Create new settings
      const newSettingDoc = new Settings(req.body);
      const newSetting = await newSettingDoc.save();
      isNew = true;

      // Log activity
      await ActivityLog.create({
        user: req.body.createdBy || 'System',
        action: 'create',
        entity: 'Settings',
        entityId: newSetting._id,
        description: 'Yeni ayar oluşturuldu',
        institution: newSetting.institution
      });

      setting = await Settings.findById(newSetting._id)
        .populate('institution', 'name');
    }

    res.status(isNew ? 201 : 200).json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update setting
router.put('/:id', async (req, res) => {
  try {
    const setting = await Settings.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Settings',
      entityId: setting._id,
      description: `Ayar güncellendi: ${setting.key}`,
      institution: setting.institution._id
    });

    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update setting by key
router.put('/key/:key', async (req, res) => {
  try {
    const { institutionId } = req.query;
    const filter = { key: req.params.key };

    if (institutionId) filter.institution = institutionId;

    const setting = await Settings.findOneAndUpdate(
      filter,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    ).populate('institution', 'name');

    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Settings',
      entityId: setting._id,
      description: `Ayar güncellendi: ${setting.key}`,
      institution: setting.institution._id
    });

    res.json(setting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete setting
router.delete('/:id', async (req, res) => {
  try {
    const setting = await Settings.findById(req.params.id);
    if (!setting) {
      return res.status(404).json({ message: 'Ayar bulunamadı' });
    }

    await Settings.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Settings',
      entityId: setting._id,
      description: `Ayar silindi: ${setting.key}`,
      institution: setting.institution
    });

    res.json({ message: 'Ayar silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset database (DANGER ZONE - only for superadmin)
router.post('/reset-database', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre gerekli' });
    }

    // Find user and get password
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Check if user is superadmin
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Bu işlem için süperadmin yetkisi gerekli' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Şifre hatalı' });
    }

    // If we got here, user is authenticated and is superadmin
    // Now delete everything except superadmin users

    console.log('🔥 DATABASE RESET STARTED BY:', username);

    // Delete all data
    await Student.deleteMany({});
    console.log('✓ Students deleted');

    await Course.deleteMany({});
    console.log('✓ Courses deleted');

    await StudentCourseEnrollment.deleteMany({});
    console.log('✓ Enrollments deleted');

    await ScheduledLesson.deleteMany({});
    console.log('✓ Scheduled Lessons deleted');

    await Attendance.deleteMany({});
    console.log('✓ Attendance records deleted');

    await TrialLesson.deleteMany({});
    console.log('✓ Trial Lessons deleted');

    await PaymentPlan.deleteMany({});
    console.log('✓ Payment Plans deleted');

    await Payment.deleteMany({});
    console.log('✓ Payments deleted');

    await Expense.deleteMany({});
    console.log('✓ Expenses deleted');

    await CashRegister.deleteMany({});
    console.log('✓ Cash Registers deleted');

    await Instructor.deleteMany({});
    console.log('✓ Instructors deleted');

    await Season.deleteMany({});
    console.log('✓ Seasons deleted');

    await Institution.deleteMany({});
    console.log('✓ Institutions deleted');

    await Settings.deleteMany({});
    console.log('✓ Settings deleted');

    await ActivityLog.deleteMany({});
    console.log('✓ Activity Logs deleted');

    // Delete all users except superadmins
    const result = await User.deleteMany({ role: { $ne: 'superadmin' } });
    console.log(`✓ Users deleted (${result.deletedCount} non-superadmin users)`);

    // Log the reset action
    await ActivityLog.create({
      user: username,
      action: 'reset',
      entity: 'Database',
      entityId: null,
      description: 'Veritabanı sıfırlandı - tüm veriler silindi (superadmin hariç)',
      institution: null,
      season: null
    });

    console.log('✅ DATABASE RESET COMPLETED');

    res.json({
      message: 'Veritabanı başarıyla sıfırlandı',
      deletedCounts: {
        students: 'all',
        courses: 'all',
        enrollments: 'all',
        paymentPlans: 'all',
        payments: 'all',
        expenses: 'all',
        cashRegisters: 'all',
        instructors: 'all',
        seasons: 'all',
        institutions: 'all',
        settings: 'all',
        activityLogs: 'all',
        users: `${result.deletedCount} (superadmin excluded)`
      }
    });
  } catch (error) {
    console.error('❌ DATABASE RESET ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
