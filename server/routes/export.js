const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const PaymentPlan = require('../models/PaymentPlan');
const Instructor = require('../models/Instructor');
const Course = require('../models/Course');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const CashRegister = require('../models/CashRegister');
const ScheduledLesson = require('../models/ScheduledLesson');
const Attendance = require('../models/Attendance');
const TrialLesson = require('../models/TrialLesson');
const RecurringExpense = require('../models/RecurringExpense');
const Institution = require('../models/Institution');
const Season = require('../models/Season');
const {
  exportStudentsToExcel,
  exportPaymentsToExcel,
  exportExpensesToExcel,
  exportReportToExcel,
  createComprehensiveBackup
} = require('../utils/excelExporter');

// Export students to Excel
router.get('/students', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ lastName: 1, firstName: 1 });

    const workbook = await exportStudentsToExcel(students);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=ogrenciler-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export payments to Excel
router.get('/payments', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName')
      .populate('institution', 'name')
      .populate('season', 'name')
      .sort({ date: -1 });

    const workbook = await exportPaymentsToExcel(payments);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=odemeler-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export expenses to Excel
router.get('/expenses', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name')
      .sort({ date: -1 });

    const workbook = await exportExpensesToExcel(expenses);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=giderler-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export report to Excel
router.get('/report', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Fetch payments and expenses
    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName')
      .populate('institution', 'name')
      .sort({ date: -1 });

    const expenses = await Expense.find(filter)
      .populate('institution', 'name')
      .sort({ date: -1 });

    // Calculate summary
    const totalIncome = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalExpenses = expenses
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const netProfit = totalIncome - totalExpenses;

    const reportData = {
      title: 'Finansal Rapor',
      startDate: startDate || new Date(0),
      endDate: endDate || new Date(),
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        pendingPayments
      },
      payments,
      expenses
    };

    const workbook = await exportReportToExcel(reportData);

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=rapor-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export cash register transactions to Excel
router.get('/cash-register-transactions/:cashRegisterId', async (req, res) => {
  try {
    const { cashRegisterId } = req.params;
    const ExcelJS = require('exceljs');

    const cashRegister = await CashRegister.findById(cashRegisterId)
      .populate('institution', 'name');

    if (!cashRegister) {
      return res.status(404).json({ message: 'Kasa bulunamadı' });
    }

    // Get payments for this cash register
    const payments = await Payment.find({ cashRegister: cashRegisterId })
      .populate('student', 'firstName lastName')
      .populate('course', 'name')
      .sort({ paymentDate: -1 })
      .lean();

    // Get expenses for this cash register
    const expenses = await Expense.find({ cashRegister: cashRegisterId })
      .populate('instructor', 'firstName lastName')
      .sort({ expenseDate: -1 })
      .lean();

    // Combine and sort by date
    const allTransactions = [];

    // Add payments as income
    payments.forEach(p => {
      allTransactions.push({
        date: p.paymentDate || p.createdAt,
        type: 'GİRİŞ',
        category: 'Ödeme',
        description: p.student ? `${p.student.firstName} ${p.student.lastName}${p.course ? ' - ' + p.course.name : ''}` : (p.description || 'Ödeme'),
        amount: p.amount || 0,
        inAmount: p.amount || 0,
        outAmount: 0,
        paymentMethod: p.paymentMethod || '-',
        notes: p.notes || ''
      });
    });

    // Add expenses (outgoing) and manual income/transfers (incoming)
    expenses.forEach(e => {
      // Check if this is income (manual income or incoming transfer)
      const isIncome = e.isManualIncome === true ||
                       e.category === 'Kasa Giriş (Manuel)' ||
                       e.category === 'Virman (Giriş)';

      allTransactions.push({
        date: e.expenseDate || e.createdAt,
        type: isIncome ? 'GİRİŞ' : 'ÇIKIŞ',
        category: e.category || 'Gider',
        description: e.description || (e.instructor ? `Eğitmen: ${e.instructor.firstName} ${e.instructor.lastName}` : 'Gider'),
        amount: e.amount || 0,
        inAmount: isIncome ? (e.amount || 0) : 0,
        outAmount: isIncome ? 0 : (e.amount || 0),
        paymentMethod: e.paymentMethod || '-',
        notes: e.notes || ''
      });
    });

    // Sort by date (newest first)
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FOFORA';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Kasa Hareketleri');

    // Title row
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `${cashRegister.name} - Kasa Hareketleri Raporu`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Info row
    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')} | Güncel Bakiye: ${cashRegister.currentBalance?.toLocaleString('tr-TR') || 0} TL`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Empty row
    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow(['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Giriş', 'Çıkış', 'Ödeme Yöntemi', 'Notlar']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4CAF50' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // Tarih
      { width: 10 }, // Tür
      { width: 15 }, // Kategori
      { width: 40 }, // Açıklama
      { width: 15 }, // Giriş
      { width: 15 }, // Çıkış
      { width: 15 }, // Ödeme Yöntemi
      { width: 30 }, // Notlar
    ];

    // Data rows
    let totalIn = 0;
    let totalOut = 0;

    allTransactions.forEach(t => {
      const row = worksheet.addRow([
        new Date(t.date).toLocaleDateString('tr-TR'),
        t.type,
        t.category,
        t.description,
        t.inAmount > 0 ? t.inAmount : '',
        t.outAmount > 0 ? t.outAmount : '',
        t.paymentMethod,
        t.notes
      ]);

      // Color coding for in/out
      if (t.type === 'GİRİŞ') {
        row.getCell(5).font = { color: { argb: 'FF4CAF50' } }; // Green for income
        totalIn += t.inAmount;
      } else {
        row.getCell(6).font = { color: { argb: 'FFF44336' } }; // Red for expense
        totalOut += t.outAmount;
      }
    });

    // Summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['', '', '', 'TOPLAM', totalIn, totalOut, '', '']);
    summaryRow.font = { bold: true };
    summaryRow.getCell(5).font = { bold: true, color: { argb: 'FF4CAF50' } };
    summaryRow.getCell(6).font = { bold: true, color: { argb: 'FFF44336' } };

    // Net row
    const netRow = worksheet.addRow(['', '', '', 'NET', totalIn - totalOut, '', '', '']);
    netRow.font = { bold: true };
    netRow.getCell(5).font = { bold: true, color: totalIn - totalOut >= 0 ? { argb: 'FF4CAF50' } : { argb: 'FFF44336' } };

    // Set response headers
    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Kasa_Hareketleri_${cashRegister.name.replace(/\s/g, '_')}_${dateStr}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Cash register transactions export error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Comprehensive backup - ALL data in one Excel file
router.get('/full-backup', async (req, res) => {
  try {
    console.log('Starting comprehensive backup export...');
    const startTime = Date.now();

    // Fetch all data in parallel for performance
    const [
      students,
      instructors,
      courses,
      enrollments,
      paymentPlans,
      payments,
      expenses,
      cashRegisters,
      scheduledLessons,
      attendances,
      trialLessons,
      recurringExpenses,
      institutions,
      seasons
    ] = await Promise.all([
      // Students with populated references
      Student.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ lastName: 1, firstName: 1 })
        .lean(),

      // Instructors
      Instructor.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ lastName: 1, firstName: 1 })
        .lean(),

      // Courses
      Course.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .populate('instructor', 'firstName lastName')
        .sort({ name: 1 })
        .lean(),

      // Enrollments
      StudentCourseEnrollment.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ enrollmentDate: -1 })
        .lean(),

      // Payment Plans with installments
      PaymentPlan.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ createdAt: -1 })
        .lean(),

      // Payments
      Payment.find()
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('cashRegister', 'name')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ paymentDate: -1 })
        .lean(),

      // Expenses
      Expense.find()
        .populate('cashRegister', 'name')
        .populate('instructor', 'firstName lastName')
        .populate('recurringExpense', 'title')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ expenseDate: -1 })
        .lean(),

      // Cash Registers
      CashRegister.find()
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ name: 1 })
        .lean(),

      // Scheduled Lessons
      ScheduledLesson.find()
        .populate('course', 'name')
        .populate('student', 'firstName lastName')
        .populate('instructor', 'firstName lastName')
        .populate('additionalInstructors.instructor', 'firstName lastName')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ date: -1 })
        .lean(),

      // Attendance - with nested population
      Attendance.find()
        .populate('student', 'firstName lastName')
        .populate({
          path: 'scheduledLesson',
          populate: [
            { path: 'course', select: 'name' }
          ]
        })
        .sort({ createdAt: -1 })
        .lean(),

      // Trial Lessons
      TrialLesson.find()
        .populate('course', 'name')
        .populate('instructor', 'firstName lastName')
        .populate('student', 'firstName lastName')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ scheduledDate: -1 })
        .lean(),

      // Recurring Expenses
      RecurringExpense.find()
        .populate('defaultCashRegister', 'name')
        .populate('instructor', 'firstName lastName')
        .populate('institution', 'name')
        .populate('season', 'name')
        .sort({ title: 1 })
        .lean(),

      // Institutions
      Institution.find().sort({ name: 1 }).lean(),

      // Seasons
      Season.find()
        .populate('institution', 'name')
        .sort({ startDate: -1 })
        .lean()
    ]);

    console.log(`Data fetched in ${Date.now() - startTime}ms`);
    console.log(`Students: ${students.length}, Payments: ${payments.length}, Expenses: ${expenses.length}`);

    // Create the comprehensive backup workbook
    const workbook = await createComprehensiveBackup({
      students,
      instructors,
      courses,
      enrollments,
      paymentPlans,
      payments,
      expenses,
      cashRegisters,
      scheduledLessons,
      attendances,
      trialLessons,
      recurringExpenses,
      institutions,
      seasons
    });

    // Generate filename with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `FOFORA-Yedek-${dateStr}_${timeStr}.xlsx`;

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );

    // Write to response
    await workbook.xlsx.write(res);

    console.log(`Backup export completed in ${Date.now() - startTime}ms`);
    res.end();
  } catch (error) {
    console.error('Full backup export error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
