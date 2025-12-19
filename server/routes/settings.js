const express = require('express');
const router = express.Router();
const multer = require('multer');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');

// Multer configuration for letterhead upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for letterhead
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
    }
  }
});
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
    const { category } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
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
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
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
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
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

// Upload letterhead image
router.post('/letterhead/:institutionId', upload.single('letterhead'), async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { topMargin, bottomMargin, sideMargin } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Antetli kağıt görseli gerekli' });
    }

    // Convert to Base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Find or create settings for this institution
    let settings = await Settings.findOne({ institution: institutionId });

    const letterheadData = {
      imageUrl: base64Image,
      topMargin: parseInt(topMargin) || 120,
      bottomMargin: parseInt(bottomMargin) || 60,
      sideMargin: parseInt(sideMargin) || 40
    };

    if (settings) {
      settings.letterhead = letterheadData;
      settings.updatedBy = req.body.updatedBy || 'System';
      await settings.save();
    } else {
      settings = await Settings.create({
        institution: institutionId,
        letterhead: letterheadData,
        createdBy: req.body.updatedBy || 'System'
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'Settings',
      entityId: settings._id,
      description: 'Antetli kağıt yüklendi',
      institution: institutionId
    });

    res.json({
      message: 'Antetli kağıt başarıyla yüklendi',
      letterhead: settings.letterhead
    });
  } catch (error) {
    console.error('Letterhead upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete letterhead image
router.delete('/letterhead/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;

    const settings = await Settings.findOne({ institution: institutionId });

    if (!settings) {
      return res.status(404).json({ message: 'Ayarlar bulunamadı' });
    }

    settings.letterhead = {
      imageUrl: null,
      topMargin: 120,
      bottomMargin: 60,
      sideMargin: 40
    };
    settings.updatedBy = req.body?.updatedBy || 'System';
    await settings.save();

    // Log activity
    await ActivityLog.create({
      user: req.body?.updatedBy || 'System',
      action: 'update',
      entity: 'Settings',
      entityId: settings._id,
      description: 'Antetli kağıt silindi',
      institution: institutionId
    });

    res.json({ message: 'Antetli kağıt silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset database (DANGER ZONE - only for superadmin)
// Supports selective deletion by institution, data types, and users
router.post('/reset-database', async (req, res) => {
  try {
    const {
      username,
      password,
      institutionId, // Optional: specific institution to reset (null = all)
      dataTypes, // Array of data types to delete: ['students', 'courses', 'payments', etc.]
      deleteUsers, // Boolean: whether to delete users
      usersToDelete, // Array of user IDs to delete (if deleteUsers is true)
      deleteInstitutions, // Boolean: whether to delete institutions
      deleteSeasons, // Boolean: whether to delete seasons
    } = req.body;

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
    console.log('🔥 DATABASE RESET STARTED BY:', username);
    console.log('Options:', { institutionId, dataTypes, deleteUsers, deleteInstitutions, deleteSeasons });

    const deletedCounts = {};

    // Build filter for institution-specific deletion
    const institutionFilter = institutionId ? { institution: institutionId } : {};

    // Determine what to delete
    const deleteAll = !dataTypes || dataTypes.length === 0;
    const shouldDelete = (type) => deleteAll || dataTypes.includes(type);

    // Delete data based on selection
    if (shouldDelete('students')) {
      const result = await Student.deleteMany(institutionFilter);
      deletedCounts.students = result.deletedCount;
      console.log(`✓ Students deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('courses')) {
      const result = await Course.deleteMany(institutionFilter);
      deletedCounts.courses = result.deletedCount;
      console.log(`✓ Courses deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('enrollments')) {
      const result = await StudentCourseEnrollment.deleteMany(institutionFilter);
      deletedCounts.enrollments = result.deletedCount;
      console.log(`✓ Enrollments deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('scheduledLessons')) {
      const result = await ScheduledLesson.deleteMany(institutionFilter);
      deletedCounts.scheduledLessons = result.deletedCount;
      console.log(`✓ Scheduled Lessons deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('attendance')) {
      const result = await Attendance.deleteMany(institutionFilter);
      deletedCounts.attendance = result.deletedCount;
      console.log(`✓ Attendance records deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('trialLessons')) {
      // Delete ALL trial lessons regardless of status (completed, converted, etc.)
      const result = await TrialLesson.deleteMany(institutionFilter);
      deletedCounts.trialLessons = result.deletedCount;
      console.log(`✓ Trial Lessons deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('paymentPlans')) {
      const result = await PaymentPlan.deleteMany(institutionFilter);
      deletedCounts.paymentPlans = result.deletedCount;
      console.log(`✓ Payment Plans deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('payments')) {
      const result = await Payment.deleteMany(institutionFilter);
      deletedCounts.payments = result.deletedCount;
      console.log(`✓ Payments deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('expenses')) {
      const result = await Expense.deleteMany(institutionFilter);
      deletedCounts.expenses = result.deletedCount;
      console.log(`✓ Expenses deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('cashRegisters')) {
      const result = await CashRegister.deleteMany(institutionFilter);
      deletedCounts.cashRegisters = result.deletedCount;
      console.log(`✓ Cash Registers deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('instructors')) {
      const result = await Instructor.deleteMany(institutionFilter);
      deletedCounts.instructors = result.deletedCount;
      console.log(`✓ Instructors deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('activityLogs')) {
      const result = await ActivityLog.deleteMany(institutionFilter);
      deletedCounts.activityLogs = result.deletedCount;
      console.log(`✓ Activity Logs deleted: ${result.deletedCount}`);
    }

    if (shouldDelete('settings')) {
      const settingsFilter = institutionId ? { institution: institutionId } : {};
      const result = await Settings.deleteMany(settingsFilter);
      deletedCounts.settings = result.deletedCount;
      console.log(`✓ Settings deleted: ${result.deletedCount}`);
    }

    // Delete seasons if requested
    if (deleteSeasons) {
      const seasonFilter = institutionId ? { institution: institutionId } : {};
      const result = await Season.deleteMany(seasonFilter);
      deletedCounts.seasons = result.deletedCount;
      console.log(`✓ Seasons deleted: ${result.deletedCount}`);
    }

    // Delete institutions if requested (only when no specific institution selected or deleting that specific one)
    if (deleteInstitutions) {
      const instFilter = institutionId ? { _id: institutionId } : {};
      const result = await Institution.deleteMany(instFilter);
      deletedCounts.institutions = result.deletedCount;
      console.log(`✓ Institutions deleted: ${result.deletedCount}`);
    }

    // Delete users if requested
    if (deleteUsers && usersToDelete && usersToDelete.length > 0) {
      // Never delete superadmins
      const result = await User.deleteMany({
        _id: { $in: usersToDelete },
        role: { $ne: 'superadmin' }
      });
      deletedCounts.users = result.deletedCount;
      console.log(`✓ Users deleted: ${result.deletedCount}`);
    } else if (deleteUsers && !usersToDelete) {
      // Delete all non-superadmin users for the institution (or all if no institution)
      let userFilter = { role: { $ne: 'superadmin' } };
      if (institutionId) {
        userFilter.institutions = institutionId;
      }
      const result = await User.deleteMany(userFilter);
      deletedCounts.users = result.deletedCount;
      console.log(`✓ Users deleted: ${result.deletedCount}`);
    }

    // Log the reset action
    await ActivityLog.create({
      user: username,
      action: 'reset',
      entity: 'Database',
      entityId: null,
      description: `Veritabanı sıfırlandı${institutionId ? ' (belirli kurum)' : ' (tüm veriler)'}`,
      metadata: { deletedCounts, institutionId, dataTypes },
      institution: institutionId || null,
      season: null
    });

    console.log('✅ DATABASE RESET COMPLETED');

    res.json({
      message: 'Veriler başarıyla silindi',
      deletedCounts
    });
  } catch (error) {
    console.error('❌ DATABASE RESET ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
