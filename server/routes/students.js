const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');

// Get all students with filtering
router.get('/', async (req, res) => {
  try {
    const { includeArchived, includeDiscountInfo } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;

    // Season filter is required
    if (!seasonId) {
      return res.status(400).json({ message: 'Season parameter is required' });
    }

    const filter = { season: seasonId };
    if (institutionId) filter.institution = institutionId;

    // By default, exclude archived students unless includeArchived=true
    if (includeArchived !== 'true') {
      filter.isArchived = { $ne: true };
    }

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    // If discount info is requested, fetch enrollments with discount info
    if (includeDiscountInfo === 'true') {
      const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
      const PaymentPlan = require('../models/PaymentPlan');
      const studentIds = students.map(s => s._id);

      // Fetch enrollments and payment plans in parallel
      const [enrollments, paymentPlans] = await Promise.all([
        StudentCourseEnrollment.find({
          student: { $in: studentIds },
          season: seasonId,
          isActive: true
        })
          .populate('course', 'name')
          .lean(),
        PaymentPlan.find({
          student: { $in: studentIds },
          season: seasonId
        })
          .select('student course totalAmount discountedAmount discountType discountValue')
          .lean()
      ]);

      // Index payment plans by student - store ALL plans in an array (not just one per course)
      const paymentPlansByStudent = {};
      paymentPlans.forEach(plan => {
        const studentId = plan.student.toString();
        if (!paymentPlansByStudent[studentId]) {
          paymentPlansByStudent[studentId] = [];
        }
        paymentPlansByStudent[studentId].push(plan);
      });

      // Also create a map for enrollment lookup (use the plan with discount if multiple exist)
      const paymentPlanMap = {};
      paymentPlans.forEach(plan => {
        const key = `${plan.student.toString()}_${plan.course?.toString() || ''}`;
        // If a plan with discount exists, prefer it over one without
        const existingPlan = paymentPlanMap[key];
        const hasDiscount = plan.discountedAmount && plan.discountedAmount < plan.totalAmount;
        const existingHasDiscount = existingPlan && existingPlan.discountedAmount && existingPlan.discountedAmount < existingPlan.totalAmount;

        if (!existingPlan || (hasDiscount && !existingHasDiscount)) {
          paymentPlanMap[key] = plan;
        }
      });

      // Group discounts by student - process PAYMENT PLANS directly (more accurate than enrollments)
      const studentDiscounts = {};

      // First, initialize with enrollment info for course names
      enrollments.forEach(enrollment => {
        const studentId = enrollment.student.toString();
        if (!studentDiscounts[studentId]) {
          studentDiscounts[studentId] = {
            discounts: [],
            courses: [],
            totalDiscountAmount: 0,
            processedPlans: new Set() // Track processed plans to avoid duplicates
          };
        }
        studentDiscounts[studentId].courses.push(enrollment.course?.name || 'Ders');
      });

      // Process ALL payment plans to find discounts (not just enrollments)
      paymentPlans.forEach(plan => {
        const studentId = plan.student.toString();
        if (!studentDiscounts[studentId]) {
          studentDiscounts[studentId] = {
            discounts: [],
            courses: [],
            totalDiscountAmount: 0,
            processedPlans: new Set()
          };
        }

        // Skip if already processed this plan
        if (studentDiscounts[studentId].processedPlans.has(plan._id.toString())) {
          return;
        }
        studentDiscounts[studentId].processedPlans.add(plan._id.toString());

        // Check if this payment plan has a discount
        const totalAmount = plan.totalAmount || 0;
        const discountedAmount = plan.discountedAmount || plan.totalAmount || 0;
        const discountAmount = totalAmount - discountedAmount;

        // Only process if there's actually a discount
        if (discountAmount > 0 && totalAmount > 0) {
          // Calculate percentage
          let percentageValue = 0;
          let discountType = plan.discountType || 'percentage';

          if (discountType === 'fullScholarship') {
            percentageValue = 100;
          } else if (plan.discountValue) {
            percentageValue = plan.discountValue;
          } else {
            // Calculate from amounts
            percentageValue = Math.round((discountAmount / totalAmount) * 1000) / 10; // One decimal
          }

          // Find course name from enrollments if available
          const enrollment = enrollments.find(e =>
            e.student.toString() === studentId &&
            e.course?._id?.toString() === plan.course?.toString()
          );
          const courseName = enrollment?.course?.name || 'Ders';

          studentDiscounts[studentId].discounts.push({
            type: discountType,
            value: plan.discountValue || discountAmount,
            percentageValue: percentageValue,
            totalAmount: totalAmount,
            discountAmount: discountAmount,
            description: plan.discountDescription || '',
            courseName: courseName,
            paymentPlanId: plan._id
          });

          studentDiscounts[studentId].totalDiscountAmount += discountAmount;
        }
      });

      // Add discount info to students
      students.forEach(student => {
        const discountInfo = studentDiscounts[student._id.toString()];
        if (discountInfo) {
          student.enrolledCourses = discountInfo.courses;
          student.discounts = discountInfo.discounts;
          student.totalDiscountAmount = discountInfo.totalDiscountAmount;
          // Set primary discount (fullScholarship takes priority, then highest percentage)
          if (discountInfo.discounts.length > 0) {
            const fullScholarship = discountInfo.discounts.find(d => d.type === 'fullScholarship');
            if (fullScholarship) {
              student.primaryDiscount = fullScholarship;
            } else {
              // Find the highest discount by percentage
              const sortedDiscounts = discountInfo.discounts.sort((a, b) => {
                return (b.percentageValue || 0) - (a.percentageValue || 0);
              });
              student.primaryDiscount = sortedDiscounts[0];
            }
          }
        }
      });
    }

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
// Check student related transactions before deletion
router.get('/:id/check-related-records', async (req, res) => {
  try {
    const studentId = req.params.id;
    const Payment = require('../models/Payment');
    const Expense = require('../models/Expense');

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Find all payments related to this student
    const payments = await Payment.find({ student: studentId })
      .populate('course', 'name')
      .populate('cashRegister', 'name')
      .sort({ paymentDate: -1 });

    // Find all expenses that might be related (auto-generated expenses like VAT, commission)
    const relatedExpenses = await Expense.find({
      $or: [
        { relatedStudent: studentId },
        { description: { $regex: `${student.firstName}.*${student.lastName}|${student.lastName}.*${student.firstName}`, $options: 'i' } }
      ]
    })
      .populate('cashRegister', 'name')
      .sort({ expenseDate: -1 });

    // Calculate totals
    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpense = relatedExpenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        balance: student.balance
      },
      payments: payments.map(p => ({
        _id: p._id,
        amount: p.amount,
        date: p.paymentDate,
        course: p.course?.name || '-',
        paymentType: p.paymentType,
        cashRegister: p.cashRegister?.name || '-',
        isInvoiced: p.isInvoiced,
        isRefunded: p.isRefunded
      })),
      expenses: relatedExpenses.map(e => ({
        _id: e._id,
        amount: e.amount,
        date: e.expenseDate,
        category: e.category,
        description: e.description,
        cashRegister: e.cashRegister?.name || '-',
        isAutoGenerated: e.isAutoGenerated
      })),
      totals: {
        totalIncome,
        totalExpense,
        paymentCount: payments.length,
        expenseCount: relatedExpenses.length
      }
    });
  } catch (error) {
    console.error('Error checking related records:', error);
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const Payment = require('../models/Payment');
    const Expense = require('../models/Expense');
    const PaymentPlan = require('../models/PaymentPlan');
    const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
    const CashRegister = require('../models/CashRegister');

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    // Delete related records and revert cash register balances
    // 1. Get all payments and revert their effects before deleting
    const payments = await Payment.find({ student: req.params.id });
    for (const payment of payments) {
      // Revert cash register balance (subtract payment amount)
      if (payment.cashRegister) {
        await CashRegister.findByIdAndUpdate(payment.cashRegister, {
          $inc: { balance: -payment.amount }
        });
      }
    }
    await Payment.deleteMany({ student: req.params.id });

    // 2. Get all related expenses and revert their effects before deleting
    const relatedExpenses = await Expense.find({
      $or: [
        { relatedStudent: req.params.id },
        { description: { $regex: `${student.firstName}.*${student.lastName}|${student.lastName}.*${student.firstName}`, $options: 'i' } }
      ]
    });
    for (const expense of relatedExpenses) {
      // Revert cash register balance (add back expense amount)
      if (expense.cashRegister) {
        await CashRegister.findByIdAndUpdate(expense.cashRegister, {
          $inc: { balance: expense.amount }
        });
      }
    }
    await Expense.deleteMany({
      $or: [
        { relatedStudent: req.params.id },
        { description: { $regex: `${student.firstName}.*${student.lastName}|${student.lastName}.*${student.firstName}`, $options: 'i' } }
      ]
    });

    // 3. Delete payment plans
    await PaymentPlan.deleteMany({ student: req.params.id });

    // 4. Delete enrollments
    await StudentCourseEnrollment.deleteMany({ student: req.params.id });

    // 5. Finally delete the student
    await Student.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci ve ilgili tüm kayıtlar silindi: ${student.firstName} ${student.lastName}`,
      institution: student.institution,
      season: student.season
    });

    res.json({
      message: 'Öğrenci ve ilgili tüm kayıtlar başarıyla silindi',
      deleted: {
        student: student.firstName + ' ' + student.lastName
      }
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: error.message });
  }
});

// Archive student
router.post('/:id/archive', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    student.isArchived = true;
    student.archivedDate = new Date();
    student.archiveReason = req.body.reason || '';
    student.updatedBy = req.body.archivedBy || 'user';
    await student.save();

    await ActivityLog.create({
      user: req.body.archivedBy || 'System',
      action: 'archive',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci arşivlendi: ${student.firstName} ${student.lastName}${req.body.reason ? ` - Sebep: ${req.body.reason}` : ''}`,
      institution: student.institution,
      season: student.season
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unarchive student
router.post('/:id/unarchive', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    student.isArchived = false;
    student.archivedDate = null;
    student.archiveReason = null;
    student.updatedBy = req.body.unarchivedBy || 'user';
    await student.save();

    await ActivityLog.create({
      user: req.body.unarchivedBy || 'System',
      action: 'unarchive',
      entity: 'Student',
      entityId: student._id,
      description: `Öğrenci arşivden çıkarıldı: ${student.firstName} ${student.lastName}`,
      institution: student.institution,
      season: student.season
    });

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get archived students only
router.get('/archived/list', async (req, res) => {
  try {
    const { institutionId, seasonId } = req.query;

    if (!seasonId) {
      return res.status(400).json({ message: 'Season parameter is required' });
    }

    const filter = {
      season: seasonId,
      isArchived: true
    };
    if (institutionId) filter.institution = institutionId;

    const students = await Student.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .sort({ archivedDate: -1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual balance adjustment with user password verification (admin/superadmin only)
router.post('/:id/adjust-balance', async (req, res) => {
  try {
    const { adjustment, reason, password, username, updatedBy } = req.body;
    const User = require('../models/User');

    // Validate inputs
    if (typeof adjustment !== 'number' || adjustment === 0) {
      return res.status(400).json({ message: 'Geçerli bir düzenleme tutarı girin' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Düzenleme sebebi zorunludur' });
    }

    if (!password || !username) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir' });
    }

    // Verify user credentials and check role
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(403).json({ message: 'Kullanıcı bulunamadı' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(403).json({ message: 'Şifre yanlış' });
    }

    // Only superadmin and admin can adjust balance
    if (!['superadmin', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok. Sadece admin kullanıcılar bakiye düzenleyebilir.' });
    }

    // Find student
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    const oldBalance = student.balance || 0;
    const newBalance = oldBalance + adjustment;

    // Update student balance
    student.balance = newBalance;
    await student.save();

    // Log the activity
    await ActivityLog.create({
      user: updatedBy || user.username,
      action: 'update',
      entity: 'Student',
      entityId: student._id,
      description: `Manuel bakiye düzenleme: ${adjustment > 0 ? '+' : ''}₺${adjustment.toLocaleString('tr-TR')} (${oldBalance} → ${newBalance}) - Sebep: ${reason}`,
      institution: student.institution,
      season: student.season
    });

    // Populate and return updated student
    const updatedStudent = await Student.findById(student._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate');

    res.json({
      message: 'Bakiye başarıyla güncellendi',
      student: updatedStudent,
      adjustmentDetails: {
        oldBalance,
        adjustment,
        newBalance,
        reason
      }
    });
  } catch (error) {
    console.error('Error adjusting balance:', error);
    res.status(500).json({ message: error.message });
  }
});

// Recalculate student balance from payment plans (admin/superadmin only)
// This fixes balance inconsistencies caused by manual transaction deletions
router.post('/:id/recalculate-balance', async (req, res) => {
  try {
    const { password, username, updatedBy } = req.body;
    const User = require('../models/User');
    const PaymentPlan = require('../models/PaymentPlan');

    console.log('Recalculate balance request for student:', req.params.id);
    console.log('Username:', username);

    if (!password || !username) {
      return res.status(400).json({ message: 'Kullanıcı adı ve şifre gereklidir' });
    }

    // Verify user credentials and check role
    let user;
    try {
      user = await User.findOne({ username }).select('+password');
    } catch (userError) {
      console.error('Error finding user:', userError);
      return res.status(500).json({ message: 'Kullanıcı sorgusunda hata: ' + userError.message });
    }

    if (!user) {
      return res.status(403).json({ message: 'Kullanıcı bulunamadı' });
    }

    let isPasswordValid;
    try {
      isPasswordValid = await user.comparePassword(password);
    } catch (pwError) {
      console.error('Error comparing password:', pwError);
      return res.status(500).json({ message: 'Şifre doğrulamada hata: ' + pwError.message });
    }

    if (!isPasswordValid) {
      return res.status(403).json({ message: 'Şifre yanlış' });
    }

    // Only superadmin and admin can recalculate balance
    if (!['superadmin', 'admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok. Sadece admin kullanıcılar bakiye hesaplayabilir.' });
    }

    // Find student
    let student;
    try {
      student = await Student.findById(req.params.id);
    } catch (studentError) {
      console.error('Error finding student:', studentError);
      return res.status(500).json({ message: 'Öğrenci sorgusunda hata: ' + studentError.message });
    }

    if (!student) {
      return res.status(404).json({ message: 'Öğrenci bulunamadı' });
    }

    const oldBalance = student.balance || 0;

    // Find all payment plans for this student
    let paymentPlans;
    try {
      paymentPlans = await PaymentPlan.find({ student: req.params.id }).populate('course', 'name');
    } catch (planError) {
      console.error('Error finding payment plans:', planError);
      return res.status(500).json({ message: 'Ödeme planı sorgusunda hata: ' + planError.message });
    }

    console.log('Found payment plans:', paymentPlans.length);

    // Calculate correct balance from payment plans
    // Balance = sum of (discountedAmount - paidAmount) for all plans
    // This represents total remaining debt
    let calculatedBalance = 0;
    const planDetails = [];

    for (const plan of paymentPlans) {
      const planDebt = (plan.discountedAmount || 0) - (plan.paidAmount || 0);
      calculatedBalance += planDebt;
      planDetails.push({
        planId: plan._id,
        courseName: plan.course?.name || 'Bilinmiyor',
        discountedAmount: plan.discountedAmount || 0,
        paidAmount: plan.paidAmount || 0,
        remainingDebt: planDebt
      });
    }

    // Update student balance
    student.balance = calculatedBalance;
    try {
      await student.save();
    } catch (saveError) {
      console.error('Error saving student:', saveError);
      return res.status(500).json({ message: 'Öğrenci kaydedilirken hata: ' + saveError.message });
    }

    // Log the activity
    try {
      await ActivityLog.create({
        user: updatedBy || user.username,
        action: 'recalculate',
        entity: 'Student',
        entityId: student._id,
        description: `Bakiye yeniden hesaplandı: ₺${oldBalance.toLocaleString('tr-TR')} → ₺${calculatedBalance.toLocaleString('tr-TR')} (${paymentPlans.length} ödeme planı tarandı)`,
        institution: student.institution,
        season: student.season
      });
    } catch (logError) {
      console.error('Error creating activity log:', logError);
      // Don't fail the whole operation for log error
    }

    // Populate and return updated student
    let updatedStudent;
    try {
      updatedStudent = await Student.findById(student._id)
        .populate('institution', 'name')
        .populate('season', 'name startDate endDate');
    } catch (populateError) {
      console.error('Error populating student:', populateError);
      // Use the student we already have
      updatedStudent = student;
    }

    res.json({
      message: 'Bakiye başarıyla yeniden hesaplandı',
      student: updatedStudent,
      recalculationDetails: {
        oldBalance,
        newBalance: calculatedBalance,
        difference: calculatedBalance - oldBalance,
        paymentPlansScanned: paymentPlans.length,
        planDetails
      }
    });
  } catch (error) {
    console.error('Error recalculating balance:', error);
    res.status(500).json({ message: 'Beklenmeyen hata: ' + (error.message || 'Bilinmeyen hata') });
  }
});

module.exports = router;
