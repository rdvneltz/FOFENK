const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const PaymentPlan = require('../models/PaymentPlan');
const Instructor = require('../models/Instructor');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const ScheduledLesson = require('../models/ScheduledLesson');

// Get dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Count only active, non-archived students (students currently attending courses)
    // A student must be: status = 'active' AND not archived
    const activeStudentFilter = {
      ...filter,
      status: 'active',
      isArchived: { $ne: true }
    };
    const totalStudents = await Student.countDocuments(activeStudentFilter);

    // For backwards compatibility, also provide activeStudents (same count now)
    const activeStudents = totalStudents;

    // Build aggregate filter with ObjectIds
    const aggregateFilter = {};
    if (institutionId) aggregateFilter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) aggregateFilter.season = new mongoose.Types.ObjectId(seasonId);

    // Date filter for payments
    const paymentsFilter = { ...aggregateFilter };
    if (startDate && endDate) {
      paymentsFilter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Total income (payments) - only completed payments
    const totalIncome = await Payment.aggregate([
      { $match: { ...paymentsFilter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Total expenses - only PAID expenses (not pending/overdue)
    // Exclude transfers and manual cash register adjustments from expense totals
    // These are internal accounting entries, not real business expenses
    const expensesFilter = {
      ...aggregateFilter,
      status: 'paid',
      isTransfer: { $ne: true },
      isManualIncome: { $ne: true },
      category: { $nin: ['Virman (Giriş)', 'Virman (Çıkış)', 'Kasa Giriş (Manuel)', 'Kasa Çıkış (Manuel)'] }
    };
    if (startDate && endDate) {
      expensesFilter.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    const totalExpenses = await Expense.aggregate([
      { $match: expensesFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Cash register balances
    const cashRegisterFilter = institutionId ? { institution: institutionId } : {};
    const cashRegisters = await CashRegister.find(cashRegisterFilter).select('name currentBalance');

    const totalCashRegisterBalance = cashRegisters.reduce((sum, cr) => sum + (cr.currentBalance || 0), 0);

    // Active enrollments
    const activeEnrollments = await StudentCourseEnrollment.countDocuments({
      ...filter,
      status: 'active'
    });

    // Total courses
    const totalCourses = await Course.countDocuments(filter);

    // Total instructors
    const instructorFilter = institutionId ? { institution: institutionId } : {};
    const totalInstructors = await Instructor.countDocuments(instructorFilter);

    res.json({
      totalStudents,
      activeStudents,
      totalIncome: totalIncome.length > 0 ? totalIncome[0].total : 0,
      totalExpenses: totalExpenses.length > 0 ? totalExpenses[0].total : 0,
      netIncome: (totalIncome.length > 0 ? totalIncome[0].total : 0) - (totalExpenses.length > 0 ? totalExpenses[0].total : 0),
      cashRegisters,
      totalCashRegisterBalance,
      activeEnrollments,
      totalCourses,
      totalInstructors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get student balances (debt/credit list)
router.get('/student-balances', async (req, res) => {
  try {
    const { balanceType } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Filter by balance type (debt, credit, or all)
    if (balanceType === 'debt') {
      filter.balance = { $gt: 0 };
    } else if (balanceType === 'credit') {
      filter.balance = { $lt: 0 };
    }

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .select('firstName lastName studentId balance email phone')
      .sort({ balance: -1 });

    // Calculate totals
    const totalDebt = students.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0);
    const totalCredit = Math.abs(students.filter(s => s.balance < 0).reduce((sum, s) => sum + s.balance, 0));

    res.json({
      students,
      totalDebt,
      totalCredit,
      netBalance: totalDebt - totalCredit
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get instructor payments list
router.get('/instructor-payments', async (req, res) => {
  try {
    const { instructorId, startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = { paymentType: 'instructorPayment' };

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get instructor payments from Expense model
    const expenseFilter = { ...filter, category: 'instructorPayment' };
    if (instructorId) expenseFilter.relatedEntity = instructorId;

    const instructorPayments = await Expense.find(expenseFilter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('cashRegister', 'name')
      .sort({ date: -1 });

    // Calculate total
    const totalPayments = instructorPayments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      payments: instructorPayments,
      totalPayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expected payments (upcoming installments)
router.get('/expected-payments', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Get all payment plans with unpaid installments
    const paymentPlans = await PaymentPlan.find({
      ...filter,
      isCompleted: false
    })
      .populate('student', 'firstName lastName studentId phone')
      .populate('course', 'name')
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    // Extract unpaid installments
    const expectedPayments = [];

    for (const plan of paymentPlans) {
      for (const installment of plan.installments) {
        if (!installment.isPaid) {
          // Apply date filter if provided
          if (startDate && endDate) {
            const dueDate = new Date(installment.dueDate);
            if (dueDate >= new Date(startDate) && dueDate <= new Date(endDate)) {
              expectedPayments.push({
                paymentPlan: plan._id,
                student: plan.student,
                course: plan.course,
                institution: plan.institution,
                season: plan.season,
                installmentNumber: installment.installmentNumber,
                amount: installment.amount,
                dueDate: installment.dueDate,
                isOverdue: new Date(installment.dueDate) < new Date()
              });
            }
          } else {
            expectedPayments.push({
              paymentPlan: plan._id,
              student: plan.student,
              course: plan.course,
              institution: plan.institution,
              season: plan.season,
              installmentNumber: installment.installmentNumber,
              amount: installment.amount,
              dueDate: installment.dueDate,
              isOverdue: new Date(installment.dueDate) < new Date()
            });
          }
        }
      }
    }

    // Sort by due date
    expectedPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Calculate totals
    const totalExpected = expectedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalOverdue = expectedPayments
      .filter(payment => payment.isOverdue)
      .reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      expectedPayments,
      totalExpected,
      totalOverdue,
      overdueCount: expectedPayments.filter(p => p.isOverdue).length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get income vs expense chart data
router.get('/income-expense-chart', async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    // Set default date range if not provided (last 12 months)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 11, 1);

    // Determine grouping format (day, month, year)
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
        break;
    }

    // Aggregate income by date
    const incomeData = await Payment.aggregate([
      {
        $match: {
          ...filter,
          paymentDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$paymentDate' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate expenses by date
    const expenseData = await Expense.aggregate([
      {
        $match: {
          ...filter,
          expenseDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$expenseDate' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Combine data
    const chartData = {};
    incomeData.forEach(item => {
      chartData[item._id] = { period: item._id, income: item.total, expense: 0 };
    });
    expenseData.forEach(item => {
      if (chartData[item._id]) {
        chartData[item._id].expense = item.total;
      } else {
        chartData[item._id] = { period: item._id, income: 0, expense: item.total };
      }
    });

    // Convert to array and add net
    const result = Object.values(chartData).map(item => ({
      ...item,
      net: item.income - item.expense
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance statistics
// Attendance model: scheduledLesson (ref), student (ref), attended (boolean)
// Must $lookup ScheduledLesson to filter by institution/season/course/date
router.get('/attendance-stats', async (req, res) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;

    // Build filter for ScheduledLesson fields
    const lessonMatch = {};
    if (institutionId) lessonMatch['lesson.institution'] = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) lessonMatch['lesson.season'] = new mongoose.Types.ObjectId(seasonId);
    if (courseId) lessonMatch['lesson.course'] = new mongoose.Types.ObjectId(courseId);
    if (startDate && endDate) {
      lessonMatch['lesson.date'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const pipeline = [
      {
        $lookup: {
          from: 'scheduledlessons',
          localField: 'scheduledLesson',
          foreignField: '_id',
          as: 'lesson'
        }
      },
      { $unwind: '$lesson' },
      ...(Object.keys(lessonMatch).length > 0 ? [{ $match: lessonMatch }] : []),
      {
        $group: {
          _id: '$attended',
          count: { $sum: 1 }
        }
      }
    ];

    const stats = await Attendance.aggregate(pipeline);

    const result = {
      present: 0,
      absent: 0,
      total: 0
    };

    stats.forEach(item => {
      if (item._id === true) {
        result.present = item.count;
      } else {
        result.absent = item.count;
      }
      result.total += item.count;
    });

    result.attendanceRate = result.total > 0
      ? ((result.present / result.total) * 100).toFixed(2)
      : 0;

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get course enrollment statistics
router.get('/course-enrollment-stats', async (req, res) => {
  try {
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    const enrollmentStats = await StudentCourseEnrollment.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $group: {
          _id: '$course',
          courseName: { $first: '$courseInfo.name' },
          enrollmentCount: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      { $sort: { enrollmentCount: -1 } }
    ]);

    res.json(enrollmentStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment method distribution
router.get('/payment-method-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expense category distribution
router.get('/expense-category-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    if (startDate && endDate) {
      filter.expenseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Expense.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'settings',
          let: { categoryId: '$category' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$categoryId'] } } }
          ],
          as: 'categoryInfo'
        }
      },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: { $arrayElemAt: ['$categoryInfo.value', 0] } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student growth chart data (last 12 months)
router.get('/chart/student-growth', async (req, res) => {
  try {
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    // Get last 12 months
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);

    // Aggregate students by registration month (Student model uses createdAt)
    const studentGrowth = await Student.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing months with 0
    const result = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const monthKey = date.toISOString().substring(0, 7);

      const found = studentGrowth.find(item => item._id === monthKey);
      result.push({
        period: monthKey,
        count: found ? found.count : 0
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment methods distribution chart data
router.get('/chart/payment-methods', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    // Set default to last 30 days if no date range
    if (startDate && endDate) {
      filter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.paymentDate = { $gte: thirtyDaysAgo };
    }

    const paymentMethods = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get collection rate statistics (tahsilat oranı)
router.get('/collection-rate', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Get actual collected amount from Payment collection (source of truth for actual money)
    const aggregateFilter = {};
    if (institutionId) aggregateFilter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) aggregateFilter.season = new mongoose.Types.ObjectId(seasonId);

    const paymentAgg = await Payment.aggregate([
      { $match: { ...aggregateFilter, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCollected = paymentAgg.length > 0 ? paymentAgg[0].total : 0;

    // Get expected amounts and overdue info from PaymentPlans
    const paymentPlans = await PaymentPlan.find(filter);

    let totalExpected = 0;
    let overdueAmount = 0;
    const now = new Date();

    // Monthly EXPECTED data from PaymentPlan installments (grouped by dueDate)
    const monthlyExpected = {};

    paymentPlans.forEach(plan => {
      plan.installments?.forEach(inst => {
        const dueDate = new Date(inst.dueDate);
        const monthKey = dueDate.toISOString().substring(0, 7);

        if (!monthlyExpected[monthKey]) {
          monthlyExpected[monthKey] = { expected: 0, collected: 0 };
        }

        totalExpected += inst.amount || 0;
        monthlyExpected[monthKey].expected += inst.amount || 0;

        if (!inst.isPaid && dueDate < now) {
          overdueAmount += (inst.amount || 0) - (inst.paidAmount || 0);
        }
      });
    });

    // Monthly COLLECTED data from Payment collection (grouped by paymentDate)
    // This ensures consistency with the Financial tab's income chart
    const monthlyPayments = await Payment.aggregate([
      { $match: { ...aggregateFilter, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Merge collected data into monthly map
    monthlyPayments.forEach(mp => {
      if (!monthlyExpected[mp._id]) {
        monthlyExpected[mp._id] = { expected: 0, collected: 0 };
      }
      monthlyExpected[mp._id].collected = mp.total;
    });

    const collectionRate = totalExpected > 0
      ? ((totalCollected / totalExpected) * 100).toFixed(1)
      : 0;

    // Convert monthly data to array and sort
    const chartData = Object.entries(monthlyExpected)
      .map(([period, data]) => ({
        period,
        expected: data.expected,
        collected: data.collected,
        rate: data.expected > 0 ? ((data.collected / data.expected) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-12); // Last 12 months

    res.json({
      totalExpected,
      totalCollected,
      overdueAmount,
      collectionRate: parseFloat(collectionRate),
      pendingAmount: totalExpected - totalCollected,
      chartData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get detailed collection data (payments by month/student)
router.get('/collection-details', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;
    const filter = { status: 'completed' };

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Get all completed payments with student, course and cash register info
    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName')
      .populate('course', 'name')
      .populate('cashRegister', 'name')
      .sort({ paymentDate: -1 });

    // Group by month
    const byMonth = {};
    payments.forEach(p => {
      const monthKey = new Date(p.paymentDate).toISOString().substring(0, 7);
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          period: monthKey,
          total: 0,
          count: 0,
          payments: []
        };
      }
      byMonth[monthKey].total += p.amount || 0;
      byMonth[monthKey].count += 1;
      byMonth[monthKey].payments.push({
        _id: p._id,
        date: p.paymentDate,
        amount: p.amount,
        studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Bilinmiyor',
        courseName: p.course?.name || 'Bilinmiyor',
        paymentType: p.paymentType,
        cashRegister: p.cashRegister?.name || '-',
        notes: p.notes
      });
    });

    // Convert to array and sort by month (newest first)
    const monthlyDetails = Object.values(byMonth)
      .sort((a, b) => b.period.localeCompare(a.period));

    res.json({
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      monthlyDetails
    });
  } catch (error) {
    console.error('Error loading collection details:', error);
    res.status(500).json({ message: error.message });
  }
});

// DIAGNOSTIC: Analyze payment discrepancy between Payment collection and PaymentPlan installments
router.get('/payment-discrepancy-analysis', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;
    const filter = {};
    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // 1. Get all completed payments from Payment collection
    const allPayments = await Payment.find({ ...filter, status: 'completed' })
      .populate('student', 'firstName lastName')
      .populate('course', 'name')
      .populate('cashRegister', 'name')
      .sort({ paymentDate: -1 });

    const totalFromPayments = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 2. Get all payment plans with installments
    const paymentPlans = await PaymentPlan.find(filter)
      .populate('student', 'firstName lastName')
      .populate('course', 'name');

    let totalFromInstallments = 0;
    const paidInstallmentsList = [];
    const allInstallmentsMap = {}; // planId -> installments

    paymentPlans.forEach(plan => {
      allInstallmentsMap[plan._id.toString()] = {
        student: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : 'Bilinmiyor',
        course: plan.course?.name || 'Bilinmiyor',
        installments: plan.installments || []
      };
      (plan.installments || []).forEach((inst, idx) => {
        if (inst.isPaid) {
          const amount = inst.paidAmount || inst.amount || 0;
          totalFromInstallments += amount;
          paidInstallmentsList.push({
            planId: plan._id,
            student: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : 'Bilinmiyor',
            course: plan.course?.name || 'Bilinmiyor',
            installmentNumber: inst.installmentNumber || (idx + 1),
            installmentAmount: inst.amount || 0,
            paidAmount: inst.paidAmount || 0,
            usedField: inst.paidAmount ? 'paidAmount' : 'amount',
            paidDate: inst.paidDate,
            paymentRecordsCount: (inst.payments || []).length
          });
        }
      });
    });

    // 3. Compare: Group payments by paymentPlan and compare with installment data
    const paymentsByPlan = {};
    allPayments.forEach(p => {
      const planId = p.paymentPlan?.toString();
      if (planId) {
        if (!paymentsByPlan[planId]) paymentsByPlan[planId] = [];
        paymentsByPlan[planId].push({
          _id: p._id,
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentType: p.paymentType,
          installmentNumber: p.installmentNumber,
          cashRegister: p.cashRegister?.name || 'Bilinmiyor',
          student: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Bilinmiyor'
        });
      }
    });

    // 4. Find plans where Payment total != Installment paidAmount total
    const mismatchedPlans = [];
    const allPlanIds = new Set([
      ...Object.keys(paymentsByPlan),
      ...Object.keys(allInstallmentsMap)
    ]);

    allPlanIds.forEach(planId => {
      const payments = paymentsByPlan[planId] || [];
      const planInfo = allInstallmentsMap[planId];
      const installments = planInfo?.installments || [];

      const paymentTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidInstTotal = installments
        .filter(i => i.isPaid)
        .reduce((sum, i) => sum + (i.paidAmount || i.amount || 0), 0);

      if (paymentTotal !== paidInstTotal) {
        mismatchedPlans.push({
          planId,
          student: planInfo?.student || payments[0]?.student || 'Bilinmiyor',
          course: planInfo?.course || 'Bilinmiyor',
          paymentCollectionTotal: paymentTotal,
          installmentPaidTotal: paidInstTotal,
          difference: paymentTotal - paidInstTotal,
          paymentCount: payments.length,
          paidInstallmentCount: installments.filter(i => i.isPaid).length,
          payments: payments.map(p => ({
            amount: p.amount,
            date: p.paymentDate,
            type: p.paymentType,
            installmentNo: p.installmentNumber,
            cashRegister: p.cashRegister
          })),
          installments: installments.map((inst, idx) => ({
            number: inst.installmentNumber || (idx + 1),
            amount: inst.amount,
            paidAmount: inst.paidAmount || 0,
            isPaid: inst.isPaid,
            paidDate: inst.paidDate
          }))
        });
      }
    });

    // Sort by biggest difference
    mismatchedPlans.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

    const totalMismatch = mismatchedPlans.reduce((sum, m) => sum + m.difference, 0);

    res.json({
      summary: {
        totalFromPayments,
        totalFromInstallments,
        difference: totalFromPayments - totalFromInstallments,
        paymentCount: allPayments.length,
        paidInstallmentCount: paidInstallmentsList.length
      },
      analysis: {
        mismatchedPlanCount: mismatchedPlans.length,
        totalMismatchAmount: totalMismatch,
        explanation: 'Aşağıdaki ödeme planlarında Payment kaydı toplamı ile taksit paidAmount toplamı tutmuyor'
      },
      mismatchedPlans
    });
  } catch (error) {
    console.error('Error analyzing payment discrepancy:', error);
    res.status(500).json({ message: error.message });
  }
});

// Fix installments with floating point issues: paidAmount matches but isPaid is false
router.post('/fix-installment-sync', async (req, res) => {
  try {
    const paymentPlans = await PaymentPlan.find({})
      .populate('student', 'firstName lastName')
      .populate('course', 'name');

    const fixed = [];

    for (const plan of paymentPlans) {
      let planModified = false;

      for (const inst of plan.installments) {
        // Case 1: paidAmount is close to amount but isPaid is false (floating point bug)
        if (!inst.isPaid && inst.paidAmount > 0 && inst.amount > 0) {
          const diff = Math.abs(inst.paidAmount - inst.amount);
          if (diff < 0.01 || inst.paidAmount >= inst.amount) {
            inst.isPaid = true;
            inst.paidDate = inst.paidDate || new Date();
            inst.paidAmount = Math.round(inst.paidAmount * 100) / 100;
            planModified = true;

            fixed.push({
              planId: plan._id,
              student: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : 'Bilinmiyor',
              course: plan.course?.name || 'Bilinmiyor',
              installmentNumber: inst.installmentNumber,
              amount: inst.amount,
              paidAmount: inst.paidAmount,
              fix: 'isPaid set to true (floating point mismatch)'
            });
          }
        }

        // Case 2: Round installment amounts that have floating point noise
        if (inst.amount && Math.abs(inst.amount - Math.round(inst.amount * 100) / 100) > 0.0001) {
          const oldAmount = inst.amount;
          inst.amount = Math.round(inst.amount * 100) / 100;
          planModified = true;

          fixed.push({
            planId: plan._id,
            student: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : 'Bilinmiyor',
            course: plan.course?.name || 'Bilinmiyor',
            installmentNumber: inst.installmentNumber,
            oldAmount: oldAmount,
            newAmount: inst.amount,
            fix: 'Amount rounded to 2 decimals'
          });
        }
      }

      // Recalculate plan totals if modified
      if (planModified) {
        const totalPaid = plan.installments
          .filter(i => i.isPaid)
          .reduce((sum, i) => sum + (i.paidAmount || i.amount || 0), 0);
        plan.paidAmount = Math.round(totalPaid * 100) / 100;
        plan.remainingAmount = Math.max(0, plan.discountedAmount - plan.paidAmount);

        const allPaid = plan.installments.every(inst => inst.isPaid || inst.amount <= 0);
        if (allPaid || plan.remainingAmount <= 0) {
          plan.isCompleted = true;
        }

        await plan.save();
      }
    }

    res.json({
      message: `${fixed.length} düzeltme yapıldı`,
      fixCount: fixed.length,
      fixes: fixed
    });
  } catch (error) {
    console.error('Error fixing installment sync:', error);
    res.status(500).json({ message: error.message });
  }
});

// Find payments in a specific month (diagnostic)
router.get('/payments-by-month', async (req, res) => {
  try {
    const { institutionId, seasonId, year, month } = req.query;
    const filter = { status: 'completed' };
    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.paymentDate = { $gte: startDate, $lte: endDate };
    }

    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName')
      .populate('course', 'name')
      .populate('cashRegister', 'name')
      .sort({ paymentDate: -1 });

    const result = payments.map(p => ({
      _id: p._id,
      student: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Bilinmiyor',
      course: p.course?.name || '-',
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentType: p.paymentType,
      cashRegister: p.cashRegister?.name || '-',
      installmentNumber: p.installmentNumber,
      paymentPlanId: p.paymentPlan,
      notes: p.notes,
      createdAt: p.createdAt
    }));

    res.json({
      count: result.length,
      total: result.reduce((sum, p) => sum + p.amount, 0),
      payments: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get installments by due-date month (for chart click detail)
router.get('/installments-by-month', async (req, res) => {
  try {
    const { institutionId, seasonId, period } = req.query;
    const filter = {};
    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    if (!period) {
      return res.status(400).json({ message: 'period parametresi gerekli (YYYY-MM)' });
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const paymentPlans = await PaymentPlan.find(filter)
      .populate('student', 'firstName lastName')
      .populate('course', 'name');

    const expected = [];
    const collected = [];

    paymentPlans.forEach(plan => {
      (plan.installments || []).forEach((inst, idx) => {
        const dueDate = new Date(inst.dueDate);
        if (dueDate >= startDate && dueDate <= endDate) {
          const item = {
            student: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : 'Bilinmiyor',
            course: plan.course?.name || '-',
            installmentNumber: inst.installmentNumber || (idx + 1),
            dueDate: inst.dueDate,
            amount: inst.amount || 0,
            paidAmount: inst.paidAmount || 0,
            isPaid: inst.isPaid,
            paidDate: inst.paidDate,
            paymentMethod: inst.paymentMethod || '-',
            planId: plan._id
          };

          expected.push(item);
          if (inst.isPaid || inst.paidAmount > 0) {
            collected.push(item);
          }
        }
      });
    });

    res.json({
      period,
      expectedTotal: expected.reduce((sum, i) => sum + i.amount, 0),
      expectedCount: expected.length,
      collectedTotal: collected.reduce((sum, i) => sum + (i.paidAmount || i.amount), 0),
      collectedCount: collected.length,
      expected: expected.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
      collected: collected.sort((a, b) => (b.paidAmount || b.amount) - (a.paidAmount || a.amount))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get comprehensive financial report
router.get('/financial-comprehensive', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;
    const filter = {};

    // Use ObjectId for aggregate queries (Mongoose .find() auto-casts, but .aggregate() does not)
    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.$gte = new Date(startDate);
      dateFilter.$lte = new Date(endDate);
    }

    // --- INCOME (Gelir) ---
    // Realized income: completed payments
    const paymentFilter = { ...filter, status: 'completed' };
    if (Object.keys(dateFilter).length > 0) {
      paymentFilter.paymentDate = dateFilter;
    }

    const paymentsByMethod = await Payment.aggregate([
      { $match: paymentFilter },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Realized income total
    const realizedIncome = paymentsByMethod.reduce((sum, p) => sum + p.total, 0);

    // Expected (pending) income: unpaid installments from PaymentPlans
    const findFilter = {};
    if (institutionId) findFilter.institution = institutionId;
    if (seasonId) findFilter.season = seasonId;

    const paymentPlans = await PaymentPlan.find(findFilter);
    let pendingIncome = 0;
    paymentPlans.forEach(plan => {
      (plan.installments || []).forEach(inst => {
        if (!inst.isPaid) {
          pendingIncome += (inst.amount || 0) - (inst.paidAmount || 0);
        }
      });
    });

    const totalIncome = realizedIncome + pendingIncome;

    // --- EXPENSES (Gider) ---
    const baseExpenseFilter = {
      ...filter,
      isTransfer: { $ne: true },
      isManualIncome: { $ne: true },
      category: { $nin: ['Virman (Giriş)', 'Virman (Çıkış)', 'Kasa Giriş (Manuel)', 'Kasa Çıkış (Manuel)'] }
    };

    // Paid expenses
    const paidExpenseFilter = { ...baseExpenseFilter, status: 'paid' };
    if (Object.keys(dateFilter).length > 0) {
      paidExpenseFilter.expenseDate = dateFilter;
    }
    const paidExpensesByCategory = await Expense.aggregate([
      { $match: paidExpenseFilter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const paidExpenses = paidExpensesByCategory.reduce((sum, e) => sum + e.total, 0);

    // Pending/upcoming expenses (status: pending or overdue)
    const pendingExpenseFilter = { ...baseExpenseFilter, status: { $in: ['pending', 'overdue'] } };
    if (Object.keys(dateFilter).length > 0) {
      pendingExpenseFilter.expenseDate = dateFilter;
    }
    const pendingExpensesByCategory = await Expense.aggregate([
      { $match: pendingExpenseFilter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const pendingExpensesTotal = pendingExpensesByCategory.reduce((sum, e) => sum + e.total, 0);

    // All expenses by category (for the pie chart)
    const allExpenseFilter = { ...baseExpenseFilter };
    if (Object.keys(dateFilter).length > 0) {
      allExpenseFilter.expenseDate = dateFilter;
    }
    const expensesByCategory = await Expense.aggregate([
      { $match: allExpenseFilter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalExpenses = paidExpenses + pendingExpensesTotal;

    // --- MONTHLY TREND (last 12 months) ---
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);

    const monthlyIncome = await Payment.aggregate([
      {
        $match: {
          ...filter,
          status: 'completed',
          paymentDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly paid expenses only
    const monthlyPaidExpenses = await Expense.aggregate([
      {
        $match: {
          ...filter,
          status: 'paid',
          expenseDate: { $gte: start, $lte: end },
          isTransfer: { $ne: true },
          isManualIncome: { $ne: true },
          category: { $nin: ['Virman (Giriş)', 'Virman (Çıkış)', 'Kasa Giriş (Manuel)', 'Kasa Çıkış (Manuel)'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly pending expenses
    const monthlyPendingExpenses = await Expense.aggregate([
      {
        $match: {
          ...filter,
          status: { $in: ['pending', 'overdue'] },
          expenseDate: { $gte: start, $lte: end },
          isTransfer: { $ne: true },
          isManualIncome: { $ne: true },
          category: { $nin: ['Virman (Giriş)', 'Virman (Çıkış)', 'Kasa Giriş (Manuel)', 'Kasa Çıkış (Manuel)'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Combine monthly data
    const monthlyTrend = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const monthKey = date.toISOString().substring(0, 7);

      const income = monthlyIncome.find(m => m._id === monthKey)?.total || 0;
      const paidExp = monthlyPaidExpenses.find(m => m._id === monthKey)?.total || 0;
      const pendingExp = monthlyPendingExpenses.find(m => m._id === monthKey)?.total || 0;

      monthlyTrend.push({
        period: monthKey,
        income,
        expense: paidExp,
        pendingExpense: pendingExp,
        net: income - paidExp
      });
    }

    res.json({
      // Gelir
      realizedIncome,
      pendingIncome,
      totalIncome,
      // Gider
      paidExpenses,
      pendingExpenses: pendingExpensesTotal,
      totalExpenses,
      // Net (realized only)
      netIncome: realizedIncome - paidExpenses,
      // Detail
      paymentsByMethod,
      expensesByCategory,
      paidExpensesByCategory,
      pendingExpensesByCategory,
      monthlyTrend
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly financial details (income or expense items for a specific month)
router.get('/financial-month-detail', async (req, res) => {
  try {
    const { institutionId, seasonId, period, type } = req.query;
    const filter = {};
    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    if (!period || !type) {
      return res.status(400).json({ message: 'period (YYYY-MM) ve type (income/expense) parametreleri gerekli' });
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    if (type === 'income') {
      const payments = await Payment.find({
        ...filter,
        status: 'completed',
        paymentDate: { $gte: startDate, $lte: endDate }
      })
        .populate('student', 'firstName lastName')
        .populate('course', 'name')
        .populate('cashRegister', 'name')
        .sort({ paymentDate: -1 });

      const items = payments.map(p => ({
        _id: p._id,
        date: p.paymentDate,
        description: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Bilinmiyor',
        category: p.paymentType,
        course: p.course?.name || '-',
        cashRegister: p.cashRegister?.name || '-',
        amount: p.amount,
        notes: p.notes
      }));

      res.json({
        period,
        type: 'income',
        total: items.reduce((sum, i) => sum + i.amount, 0),
        count: items.length,
        items
      });
    } else {
      // Expenses
      const expenses = await Expense.find({
        ...filter,
        expenseDate: { $gte: startDate, $lte: endDate },
        isTransfer: { $ne: true },
        isManualIncome: { $ne: true },
        category: { $nin: ['Virman (Giriş)', 'Virman (Çıkış)', 'Kasa Giriş (Manuel)', 'Kasa Çıkış (Manuel)'] }
      })
        .populate('cashRegister', 'name')
        .populate('instructor', 'firstName lastName')
        .sort({ expenseDate: -1 });

      const items = expenses.map(e => ({
        _id: e._id,
        date: e.expenseDate,
        description: e.description,
        category: e.category,
        status: e.status,
        cashRegister: e.cashRegister?.name || '-',
        instructor: e.instructor ? `${e.instructor.firstName} ${e.instructor.lastName}` : null,
        amount: e.amount,
        notes: e.notes
      }));

      res.json({
        period,
        type: 'expense',
        total: items.reduce((sum, i) => sum + i.amount, 0),
        count: items.length,
        items
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get student comprehensive report
router.get('/student-comprehensive', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;
    const filter = {};

    // Use ObjectId for aggregate queries
    if (institutionId) filter.institution = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) filter.season = new mongoose.Types.ObjectId(seasonId);

    // Student counts by status (non-archived)
    const statusCounts = await Student.aggregate([
      { $match: { ...filter, isArchived: { $ne: true } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Archived count separately (isArchived is a boolean flag, not a status value)
    const archivedCount = await Student.countDocuments({
      ...(institutionId ? { institution: institutionId } : {}),
      ...(seasonId ? { season: seasonId } : {}),
      isArchived: true
    });

    // Calculate totals - Student model uses: 'trial', 'active', 'passive'
    const activeCount = statusCounts.find(s => s._id === 'active')?.count || 0;
    const trialCount = statusCounts.find(s => s._id === 'trial')?.count || 0;
    const passiveCount = statusCounts.find(s => s._id === 'passive')?.count || 0;
    const totalNonArchived = statusCounts.reduce((sum, s) => sum + s.count, 0);
    const totalAll = totalNonArchived + archivedCount;

    // Enrollment statistics - StudentCourseEnrollment uses isActive (boolean), not status
    const enrollmentStats = await StudentCourseEnrollment.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $group: {
          _id: '$course',
          courseName: { $first: '$courseInfo.name' },
          totalEnrollments: { $sum: 1 },
          activeEnrollments: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { totalEnrollments: -1 } }
    ]);

    // Registration trend (last 12 months) - Student model uses createdAt, not registrationDate
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);

    const registrationTrend = await Student.aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing months
    const registrationData = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const monthKey = date.toISOString().substring(0, 7);
      const found = registrationTrend.find(r => r._id === monthKey);
      registrationData.push({
        period: monthKey,
        count: found ? found.count : 0
      });
    }

    // Discount statistics
    const discountStats = await StudentCourseEnrollment.aggregate([
      { $match: { ...filter, 'discount.type': { $exists: true, $ne: 'none' } } },
      {
        $group: {
          _id: '$discount.type',
          count: { $sum: 1 },
          totalValue: { $sum: '$discount.value' }
        }
      }
    ]);

    res.json({
      totalStudents: activeCount + trialCount, // Sadece aktif ve deneme öğrencileri
      totalAll, // Tüm öğrenciler (arşivlenmiş dahil)
      activeCount,
      trialCount,
      passiveCount,
      archivedCount,
      statusCounts,
      enrollmentStats,
      registrationData,
      discountStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance comprehensive report
// Attendance model only has: scheduledLesson (ref), student (ref), attended (boolean)
// Must $lookup through ScheduledLesson to get institution, season, course, date
router.get('/attendance-comprehensive', async (req, res) => {
  try {
    const { institutionId, seasonId, startDate, endDate } = req.query;

    // Build the match filter for ScheduledLesson fields (joined via $lookup)
    const lessonMatch = {};
    if (institutionId) lessonMatch['lesson.institution'] = new mongoose.Types.ObjectId(institutionId);
    if (seasonId) lessonMatch['lesson.season'] = new mongoose.Types.ObjectId(seasonId);
    if (startDate && endDate) {
      lessonMatch['lesson.date'] = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Base pipeline: join Attendance → ScheduledLesson
    const basePipeline = [
      {
        $lookup: {
          from: 'scheduledlessons',
          localField: 'scheduledLesson',
          foreignField: '_id',
          as: 'lesson'
        }
      },
      { $unwind: '$lesson' },
      // Filter by institution/season/date from the lesson
      ...(Object.keys(lessonMatch).length > 0 ? [{ $match: lessonMatch }] : [])
    ];

    // Overall statistics: attended=true → present, attended=false → absent
    const overallStats = await Attendance.aggregate([
      ...basePipeline,
      {
        $group: {
          _id: '$attended',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      present: 0,
      absent: 0,
      total: 0
    };
    overallStats.forEach(s => {
      if (s._id === true) {
        stats.present = s.count;
      } else {
        stats.absent = s.count;
      }
      stats.total += s.count;
    });
    stats.attendanceRate = stats.total > 0
      ? ((stats.present / stats.total) * 100).toFixed(1)
      : 0;

    // By course: join to courses collection via lesson.course
    const byCourse = await Attendance.aggregate([
      ...basePipeline,
      {
        $lookup: {
          from: 'courses',
          localField: 'lesson.course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      { $unwind: '$courseInfo' },
      {
        $group: {
          _id: '$lesson.course',
          courseName: { $first: '$courseInfo.name' },
          present: { $sum: { $cond: [{ $eq: ['$attended', true] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$attended', false] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Monthly trend (last 6 months)
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);

    const monthlyTrend = await Attendance.aggregate([
      ...basePipeline,
      { $match: { 'lesson.date': { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$lesson.date' } },
            attended: '$attended'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Process monthly trend into structured data
    const monthlyMap = {};
    monthlyTrend.forEach(item => {
      const month = item._id.month;
      if (!monthlyMap[month]) {
        monthlyMap[month] = { period: month, present: 0, absent: 0, total: 0 };
      }
      if (item._id.attended === true) {
        monthlyMap[month].present = item.count;
      } else {
        monthlyMap[month].absent = item.count;
      }
      monthlyMap[month].total += item.count;
    });

    // Fill missing months
    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(start);
      date.setMonth(start.getMonth() + i);
      const monthKey = date.toISOString().substring(0, 7);
      const found = monthlyMap[monthKey];
      monthlyData.push(found || { period: monthKey, present: 0, absent: 0, total: 0 });
    }

    // Top absent students (most absences)
    const topAbsent = await Attendance.aggregate([
      ...basePipeline,
      { $match: { attended: false } },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$student',
          studentName: { $first: { $concat: ['$studentInfo.firstName', ' ', '$studentInfo.lastName'] } },
          absentCount: { $sum: 1 }
        }
      },
      { $sort: { absentCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      stats,
      byCourse,
      monthlyTrend: monthlyData,
      topAbsent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
