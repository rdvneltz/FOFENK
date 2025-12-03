const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const PaymentPlan = require('../models/PaymentPlan');
const Instructor = require('../models/Instructor');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

// Get dashboard overview (alias for dashboard-stats)
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Total students
    const totalStudents = await Student.countDocuments(filter);

    // Active students (status: 'active')
    const activeStudents = await Student.countDocuments({ ...filter, status: 'active' });

    // Date filter for payments and expenses
    const dateFilter = { ...filter };
    if (startDate && endDate) {
      dateFilter.$or = [
        { paymentDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { date: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
    }

    // Total income (payments)
    const paymentsFilter = { ...filter };
    if (startDate && endDate) {
      paymentsFilter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    const totalIncome = await Payment.aggregate([
      { $match: paymentsFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Total expenses
    const expensesFilter = { ...filter };
    if (startDate && endDate) {
      expensesFilter.date = {
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

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Total students
    const totalStudents = await Student.countDocuments(filter);

    // Date filter for payments and expenses
    const dateFilter = { ...filter };
    if (startDate && endDate) {
      dateFilter.$or = [
        { paymentDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { date: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
    }

    // Total income (payments)
    const paymentsFilter = { ...filter };
    if (startDate && endDate) {
      paymentsFilter.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    const totalIncome = await Payment.aggregate([
      { $match: paymentsFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Total expenses
    const expensesFilter = { ...filter };
    if (startDate && endDate) {
      expensesFilter.date = {
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
    const cashRegisters = await CashRegister.find(cashRegisterFilter).select('name balance');

    const totalCashRegisterBalance = cashRegisters.reduce((sum, cr) => sum + cr.balance, 0);

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

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

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
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$date' } },
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
router.get('/attendance-stats', async (req, res) => {
  try {
    const { courseId, startDate, endDate } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (courseId) filter.course = courseId;

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Count by status
    const stats = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format response
    const result = {
      present: 0,
      absent: 0,
      excused: 0,
      late: 0,
      total: 0
    };

    stats.forEach(item => {
      result[item._id] = item.count;
      result.total += item.count;
    });

    // Calculate attendance rate
    result.attendanceRate = result.total > 0
      ? ((result.present + result.late) / result.total * 100).toFixed(2)
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

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

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

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

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

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    if (startDate && endDate) {
      filter.date = {
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

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

    // Get last 12 months
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);

    // Aggregate students by registration month
    const studentGrowth = await Student.aggregate([
      {
        $match: {
          ...filter,
          registrationDate: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$registrationDate' } },
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

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;

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

module.exports = router;
