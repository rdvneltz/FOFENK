const express = require('express');
const router = express.Router();
const archiver = require('archiver');
const multer = require('multer');
const unzipper = require('unzipper');
const { Readable } = require('stream');

// Import all models
const Student = require('../models/Student');
const Instructor = require('../models/Instructor');
const Course = require('../models/Course');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const PaymentPlan = require('../models/PaymentPlan');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const ScheduledLesson = require('../models/ScheduledLesson');
const Attendance = require('../models/Attendance');
const TrialLesson = require('../models/TrialLesson');
const RecurringExpense = require('../models/RecurringExpense');
const PlannedExpense = require('../models/PlannedExpense');
const Institution = require('../models/Institution');
const Season = require('../models/Season');
const Settings = require('../models/Settings');
const MessageTemplate = require('../models/MessageTemplate');
const SalaryAccrual = require('../models/SalaryAccrual');

// Model mapping for backup/restore
const models = {
  institutions: Institution,
  seasons: Season,
  students: Student,
  instructors: Instructor,
  courses: Course,
  enrollments: StudentCourseEnrollment,
  paymentPlans: PaymentPlan,
  payments: Payment,
  expenses: Expense,
  cashRegisters: CashRegister,
  scheduledLessons: ScheduledLesson,
  attendances: Attendance,
  trialLessons: TrialLesson,
  recurringExpenses: RecurringExpense,
  plannedExpenses: PlannedExpense,
  settings: Settings,
  messageTemplates: MessageTemplate,
  salaryAccruals: SalaryAccrual
};

// Restore order (dependencies first)
const restoreOrder = [
  'institutions',
  'seasons',
  'settings',
  'messageTemplates',
  'instructors',
  'students',
  'courses',
  'cashRegisters',
  'enrollments',
  'recurringExpenses',
  'paymentPlans',
  'payments',
  'expenses',
  'plannedExpenses',
  'scheduledLessons',
  'attendances',
  'trialLessons',
  'salaryAccruals'
];

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece ZIP dosyaları yüklenebilir'), false);
    }
  }
});

// Download full JSON backup as ZIP
router.get('/download-json', async (req, res) => {
  try {
    console.log('Starting JSON backup download...');
    const startTime = Date.now();

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `FOFORA-Backup-${dateStr}_${timeStr}.zip`;

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // Pipe archive to response
    archive.pipe(res);

    // Backup metadata
    const metadata = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      collections: []
    };

    // Export each collection
    for (const [name, Model] of Object.entries(models)) {
      try {
        const data = await Model.find().lean();
        const jsonContent = JSON.stringify(data, null, 2);
        archive.append(jsonContent, { name: `${name}.json` });
        metadata.collections.push({ name, count: data.length });
        console.log(`Exported ${name}: ${data.length} records`);
      } catch (err) {
        console.error(`Error exporting ${name}:`, err.message);
        // Continue with other collections
      }
    }

    // Add metadata file
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

    // Finalize archive
    await archive.finalize();

    console.log(`JSON backup completed in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('JSON backup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload and restore JSON backup
router.post('/restore-json', upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Yedek dosyası gerekli' });
    }

    console.log('Starting JSON restore...');
    const startTime = Date.now();

    // Parse ZIP file from buffer
    const directory = await unzipper.Open.buffer(req.file.buffer);

    // Read and parse all JSON files
    const collections = {};
    let metadata = null;

    for (const file of directory.files) {
      if (file.path.endsWith('.json')) {
        const content = await file.buffer();
        const jsonData = JSON.parse(content.toString('utf8'));

        if (file.path === 'backup-metadata.json') {
          metadata = jsonData;
        } else {
          const collectionName = file.path.replace('.json', '');
          collections[collectionName] = jsonData;
        }
      }
    }

    if (!metadata) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz yedek dosyası: metadata bulunamadı'
      });
    }

    console.log('Backup metadata:', metadata);

    // Restore collections in order
    const results = [];

    for (const collectionName of restoreOrder) {
      if (collections[collectionName] && models[collectionName]) {
        try {
          const Model = models[collectionName];
          const data = collections[collectionName];

          if (data.length > 0) {
            // Clear existing data
            await Model.deleteMany({});

            // Insert new data
            await Model.insertMany(data, { ordered: false });

            results.push({ collection: collectionName, count: data.length, status: 'success' });
            console.log(`Restored ${collectionName}: ${data.length} records`);
          } else {
            results.push({ collection: collectionName, count: 0, status: 'skipped (empty)' });
          }
        } catch (err) {
          console.error(`Error restoring ${collectionName}:`, err.message);
          results.push({ collection: collectionName, status: 'error', error: err.message });
        }
      }
    }

    console.log(`JSON restore completed in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      message: 'Yedek başarıyla geri yüklendi',
      backupDate: metadata.createdAt,
      results
    });
  } catch (error) {
    console.error('JSON restore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get backup info (for display purposes)
router.get('/info', async (req, res) => {
  try {
    const counts = {};

    for (const [name, Model] of Object.entries(models)) {
      try {
        counts[name] = await Model.countDocuments();
      } catch (err) {
        counts[name] = 0;
      }
    }

    res.json({
      success: true,
      collections: counts,
      totalRecords: Object.values(counts).reduce((a, b) => a + b, 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
