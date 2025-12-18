const express = require('express');
const router = express.Router();
const PaymentPlan = require('../models/PaymentPlan');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const CashRegister = require('../models/CashRegister');
const Student = require('../models/Student');
const StudentCourseEnrollment = require('../models/StudentCourseEnrollment');
const ActivityLog = require('../models/ActivityLog');

// Sync enrollment dates from payment plans to enrollments
// This updates enrollment dates to match the first installment due date of the payment plan
// IMPORTANT: This route must be defined BEFORE /:id routes to avoid being caught by them
router.post('/sync-enrollment-dates', async (req, res) => {
  console.log('=== SYNC ENDPOINT HIT ===');
  console.log('Body:', req.body);

  try {
    const { institutionId, seasonId, dryRun } = req.body;
    console.log('Parsed:', { institutionId, seasonId, dryRun });

    if (!institutionId || !seasonId) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Institution and season are required' });
    }

    console.log('Fetching payment plans...');
    // Get all payment plans for this institution/season with student and course details
    const paymentPlans = await PaymentPlan.find({
      institution: institutionId,
      season: seasonId
    })
      .populate('enrollment')
      .populate('student', 'firstName lastName')
      .populate('course', 'name');

    console.log('Found payment plans:', paymentPlans.length);

    let wouldUpdateCount = 0;
    const wouldUpdate = [];

    for (const plan of paymentPlans) {
      if (!plan.enrollment) continue;

      // Get the first installment's due date as the enrollment date
      const firstInstallment = plan.installments && plan.installments.length > 0
        ? plan.installments.sort((a, b) => a.installmentNumber - b.installmentNumber)[0]
        : null;

      if (firstInstallment && firstInstallment.dueDate) {
        const newEnrollmentDate = new Date(firstInstallment.dueDate);
        const currentEnrollmentDate = new Date(plan.enrollment.enrollmentDate);

        // Only update if dates are different (more than 1 day apart)
        const diffDays = Math.abs((newEnrollmentDate - currentEnrollmentDate) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          // Only actually update if NOT dry run
          if (!dryRun) {
            await StudentCourseEnrollment.findByIdAndUpdate(
              plan.enrollment._id,
              { $set: { enrollmentDate: newEnrollmentDate } }
            );
          }
          wouldUpdateCount++;
          wouldUpdate.push({
            studentName: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : 'Bilinmiyor',
            courseName: plan.course ? plan.course.name : 'Bilinmiyor',
            currentDate: currentEnrollmentDate.toISOString().split('T')[0],
            newDate: newEnrollmentDate.toISOString().split('T')[0],
            diffDays: Math.round(diffDays)
          });
        }
      }
    }

    console.log('Would update count:', wouldUpdateCount);

    const response = dryRun ? {
      mode: 'DRY RUN - Hiçbir değişiklik yapılmadı!',
      message: `${wouldUpdateCount} kayıt güncellenecek (şu an güncellenmedi)`,
      totalPlans: paymentPlans.length,
      wouldUpdateCount,
      wouldUpdate
    } : {
      mode: 'GERÇEK GÜNCELLEME',
      message: `${wouldUpdateCount} kayıt tarihi güncellendi`,
      totalPlans: paymentPlans.length,
      updatedCount: wouldUpdateCount,
      updates: wouldUpdate
    };

    console.log('Sending response:', JSON.stringify(response).substring(0, 200));
    return res.json(response);
  } catch (error) {
    console.error('Error syncing enrollment dates:', error);
    return res.status(500).json({ message: error.message });
  }
});

// Get all payment plans with filtering
router.get('/', async (req, res) => {
  try {
    const { studentId } = req.query;
    // Accept both 'institution' and 'institutionId' parameters for compatibility
    const institutionId = req.query.institution || req.query.institutionId;
    const seasonId = req.query.season || req.query.seasonId;
    const filter = {};

    if (institutionId) filter.institution = institutionId;
    if (seasonId) filter.season = seasonId;
    if (studentId) filter.student = studentId;

    const paymentPlans = await PaymentPlan.find(filter)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name')
      .sort({ createdAt: -1 });

    res.json(paymentPlans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment plan by ID
router.get('/:id', async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findById(req.params.id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth')
      .populate({
        path: 'enrollment',
        select: 'enrollmentDate isActive',
        populate: {
          path: 'course',
          select: 'name pricingType pricePerMonth pricePerLesson schedule weeklyFrequency expectedLessonsPerMonth'
        }
      });

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }
    res.json(paymentPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create payment plan
router.post('/', async (req, res) => {
  try {
    // Validate foreign keys
    if (req.body.student) {
      const studentExists = await Student.exists({ _id: req.body.student });
      if (!studentExists) {
        return res.status(404).json({ message: 'Öğrenci bulunamadı' });
      }
    }

    if (req.body.cashRegister) {
      const cashRegisterExists = await CashRegister.exists({ _id: req.body.cashRegister });
      if (!cashRegisterExists) {
        return res.status(404).json({ message: 'Kasa bulunamadı' });
      }
    }

    // Check if this is a full scholarship (100% discount)
    const isFullScholarship = req.body.discountType === 'fullScholarship' || req.body.discountedAmount === 0;

    // For full scholarship: no installments needed, plan is already complete
    let installments = req.body.installments || [];
    if (isFullScholarship) {
      // Create a single "installment" marked as paid with 0 amount
      installments = [{
        installmentNumber: 1,
        amount: 0,
        dueDate: new Date(),
        isPaid: true,
        paidAmount: 0,
        paidDate: new Date(),
        isInvoiced: false
      }];
    }

    // Set pending status for future credit card payments
    const paymentPlanData = {
      ...req.body,
      installments: installments,
      isPendingPayment: !isFullScholarship && req.body.paymentType === 'creditCard' && !req.body.autoCreatePayment,
      // For full scholarship: mark as completed immediately
      isCompleted: isFullScholarship,
      paidAmount: isFullScholarship ? 0 : (req.body.paidAmount || 0),
      remainingAmount: isFullScholarship ? 0 : (req.body.discountedAmount || 0),
      status: isFullScholarship ? 'completed' : 'pending'
    };

    const paymentPlan = new PaymentPlan(paymentPlanData);
    const newPaymentPlan = await paymentPlan.save();

    // Update student balance - add debt when payment plan is created
    // For full scholarship, discountedAmount is 0, so no debt is added
    await Student.findByIdAndUpdate(req.body.student, {
      $inc: { balance: req.body.discountedAmount }
    });

    // Sync discount info to enrollment for proper reporting
    if (req.body.enrollment && req.body.discountType && req.body.discountType !== 'none') {
      const discountUpdate = {
        'discount.type': req.body.discountType,
        'discount.value': req.body.discountValue || 0
      };

      // Set description based on discount type
      if (req.body.discountType === 'fullScholarship') {
        discountUpdate['discount.description'] = 'Tam Burslu';
      } else if (req.body.discountType === 'percentage') {
        discountUpdate['discount.description'] = `%${req.body.discountValue} İndirim`;
      } else if (req.body.discountType === 'fixed') {
        discountUpdate['discount.description'] = `₺${req.body.discountValue} İndirim`;
      }

      // Also update enrollmentDate if provided
      if (req.body.enrollmentDate) {
        discountUpdate.enrollmentDate = new Date(req.body.enrollmentDate);
      }

      await StudentCourseEnrollment.findByIdAndUpdate(
        req.body.enrollment,
        { $set: discountUpdate }
      );
    } else if (req.body.enrollment && req.body.enrollmentDate) {
      // Even without discount, update enrollmentDate if provided
      await StudentCourseEnrollment.findByIdAndUpdate(
        req.body.enrollment,
        { $set: { enrollmentDate: new Date(req.body.enrollmentDate) } }
      );
    }

    // If credit card payment and payment date is today, auto-create payment and expenses
    if (req.body.autoCreatePayment && req.body.paymentType === 'creditCard') {
      const student = await Student.findById(req.body.student);
      const chargeAmount = req.body.discountedAmount;

      // Create payment (only if autoCreatePayment is true, meaning payment date is today)
      const payment = new Payment({
        student: req.body.student,
        course: req.body.course,
        enrollment: req.body.enrollment,
        paymentPlan: newPaymentPlan._id,
        paymentType: 'creditCard',
        paymentMethod: 'creditCard',
        amount: chargeAmount,
        netAmount: chargeAmount,
        creditCardCommission: req.body.creditCardCommission,
        creditCardInstallments: req.body.creditCardInstallments,
        vat: req.body.vat,
        isInvoiced: req.body.isInvoiced,
        cashRegister: req.body.cashRegister,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        season: req.body.season,
        institution: req.body.institution,
        status: 'completed',
        notes: `Kredi kartı ödemesi - ${req.body.creditCardInstallments} taksit`,
        createdBy: req.body.createdBy
      });

      const savedPayment = await payment.save();

      // Update cash register balance
      await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
        $inc: { balance: chargeAmount }
      });

      // Update student balance - subtract payment (balance was already increased above)
      await Student.findByIdAndUpdate(req.body.student, {
        $inc: { balance: -chargeAmount }
      });

      // Create commission expense
      if (req.body.creditCardCommission && req.body.creditCardCommission.amount > 0) {
        const commissionExpense = new Expense({
          category: 'Kredi Kartı Komisyonu',
          amount: req.body.creditCardCommission.amount,
          description: `${student.firstName} ${student.lastName} - ${req.body.creditCardInstallments} Taksit (%${req.body.creditCardCommission.rate})`,
          expenseDate: new Date(),
          cashRegister: req.body.cashRegister,
          isAutoGenerated: true,
          relatedPayment: savedPayment._id,
          relatedStudent: req.body.student,
          season: req.body.season,
          institution: req.body.institution,
          createdBy: req.body.createdBy
        });

        await commissionExpense.save();

        // Deduct commission from cash register
        await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
          $inc: { balance: -req.body.creditCardCommission.amount }
        });
      }

      // Create VAT expense if invoiced
      if (req.body.isInvoiced && req.body.vat && req.body.vat.amount > 0) {
        const vatExpense = new Expense({
          category: 'KDV',
          amount: req.body.vat.amount,
          description: `${student.firstName} ${student.lastName} - ${chargeAmount.toFixed(2)} TL üzerinden %${req.body.vat.rate} KDV`,
          expenseDate: new Date(),
          cashRegister: req.body.cashRegister,
          isAutoGenerated: true,
          relatedPayment: savedPayment._id,
          relatedStudent: req.body.student,
          season: req.body.season,
          institution: req.body.institution,
          createdBy: req.body.createdBy
        });

        await vatExpense.save();

        // Deduct VAT from cash register
        await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
          $inc: { balance: -req.body.vat.amount }
        });
      }

      // Mark all installments as paid
      newPaymentPlan.installments.forEach(inst => {
        inst.isPaid = true;
        inst.paidAmount = inst.amount;
        inst.paidDate = new Date();
      });
      newPaymentPlan.paidAmount = chargeAmount;
      newPaymentPlan.isCompleted = true;
      await newPaymentPlan.save();
    }

    // Handle mixed payment (cash + credit card) - auto-create payment today
    if (req.body.autoCreatePayment && req.body.paymentType === 'mixed') {
      const student = await Student.findById(req.body.student);
      const installmentsData = req.body.installments || [];

      // Extract cash and credit card amounts from installments
      const cashInstallment = installmentsData.find(i => i.paymentMethod === 'cash');
      const creditCardInstallment = installmentsData.find(i => i.paymentMethod === 'creditCard');

      const cashAmount = cashInstallment ? cashInstallment.amount : 0;
      const creditCardAmount = creditCardInstallment ? creditCardInstallment.amount : 0;
      const totalAmount = cashAmount + creditCardAmount;

      // Create cash payment if there's a cash portion
      if (cashAmount > 0) {
        const cashPayment = new Payment({
          student: req.body.student,
          course: req.body.course,
          enrollment: req.body.enrollment,
          paymentPlan: newPaymentPlan._id,
          paymentType: 'cash',
          paymentMethod: 'cash',
          amount: cashAmount,
          netAmount: cashAmount,
          isInvoiced: req.body.isInvoiced,
          cashRegister: req.body.cashRegister,
          paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
          season: req.body.season,
          institution: req.body.institution,
          status: 'completed',
          notes: 'Karma ödeme - Nakit kısmı',
          createdBy: req.body.createdBy
        });

        await cashPayment.save();

        // Update cash register balance for cash payment
        await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
          $inc: { balance: cashAmount }
        });

        // Update student balance for cash payment
        await Student.findByIdAndUpdate(req.body.student, {
          $inc: { balance: -cashAmount }
        });
      }

      // Create credit card payment if there's a credit card portion
      if (creditCardAmount > 0) {
        const creditCardPayment = new Payment({
          student: req.body.student,
          course: req.body.course,
          enrollment: req.body.enrollment,
          paymentPlan: newPaymentPlan._id,
          paymentType: 'creditCard',
          paymentMethod: 'creditCard',
          amount: creditCardAmount,
          netAmount: creditCardAmount,
          creditCardCommission: req.body.creditCardCommission,
          creditCardInstallments: req.body.creditCardInstallments,
          isInvoiced: req.body.isInvoiced,
          cashRegister: req.body.cashRegister,
          paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
          season: req.body.season,
          institution: req.body.institution,
          status: 'completed',
          notes: `Karma ödeme - Kredi kartı kısmı (${req.body.creditCardInstallments} taksit)`,
          createdBy: req.body.createdBy
        });

        const savedCreditCardPayment = await creditCardPayment.save();

        // Update cash register balance for credit card payment
        await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
          $inc: { balance: creditCardAmount }
        });

        // Update student balance for credit card payment
        await Student.findByIdAndUpdate(req.body.student, {
          $inc: { balance: -creditCardAmount }
        });

        // Create commission expense for credit card portion
        if (req.body.creditCardCommission && req.body.creditCardCommission.amount > 0) {
          const commissionExpense = new Expense({
            category: 'Kredi Kartı Komisyonu',
            amount: req.body.creditCardCommission.amount,
            description: `${student.firstName} ${student.lastName} - Karma ödeme ${req.body.creditCardInstallments} Taksit (%${req.body.creditCardCommission.rate})`,
            expenseDate: new Date(),
            cashRegister: req.body.cashRegister,
            isAutoGenerated: true,
            relatedPayment: savedCreditCardPayment._id,
            relatedStudent: req.body.student,
            season: req.body.season,
            institution: req.body.institution,
            createdBy: req.body.createdBy
          });

          await commissionExpense.save();

          // Deduct commission from cash register
          await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
            $inc: { balance: -req.body.creditCardCommission.amount }
          });
        }
      }

      // Create VAT expense if invoiced (for total amount)
      if (req.body.isInvoiced && req.body.vat && req.body.vat.amount > 0) {
        const vatExpense = new Expense({
          category: 'KDV',
          amount: req.body.vat.amount,
          description: `${student.firstName} ${student.lastName} - Karma ödeme ${totalAmount.toFixed(2)} TL üzerinden %${req.body.vat.rate} KDV`,
          expenseDate: new Date(),
          cashRegister: req.body.cashRegister,
          isAutoGenerated: true,
          relatedStudent: req.body.student,
          season: req.body.season,
          institution: req.body.institution,
          createdBy: req.body.createdBy
        });

        await vatExpense.save();

        // Deduct VAT from cash register
        await CashRegister.findByIdAndUpdate(req.body.cashRegister, {
          $inc: { balance: -req.body.vat.amount }
        });
      }

      // Mark all installments as paid
      newPaymentPlan.installments.forEach(inst => {
        inst.isPaid = true;
        inst.paidAmount = inst.amount;
        inst.paidDate = new Date();
      });
      newPaymentPlan.paidAmount = totalAmount;
      newPaymentPlan.isCompleted = true;
      await newPaymentPlan.save();
    }

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'create',
      entity: 'PaymentPlan',
      entityId: newPaymentPlan._id,
      description: `Yeni ödeme planı oluşturuldu`,
      institution: newPaymentPlan.institution,
      season: newPaymentPlan.season
    });

    const populatedPaymentPlan = await PaymentPlan.findById(newPaymentPlan._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name');

    res.status(201).json(populatedPaymentPlan);
  } catch (error) {
    console.error('Error creating payment plan:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update payment plan
router.put('/:id', async (req, res) => {
  try {
    // Use find and save to trigger pre-save hook for remainingAmount calculation
    const paymentPlan = await PaymentPlan.findById(req.params.id);

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    // Update fields from request body
    Object.keys(req.body).forEach(key => {
      if (key !== '_id') {
        paymentPlan[key] = req.body[key];
      }
    });

    // Explicitly recalculate remainingAmount if discountedAmount changed
    if (req.body.discountedAmount !== undefined) {
      paymentPlan.remainingAmount = paymentPlan.discountedAmount - (paymentPlan.paidAmount || 0);
    }

    await paymentPlan.save();

    // Populate and return
    const populatedPaymentPlan = await PaymentPlan.findById(paymentPlan._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name');

    // Log activity
    await ActivityLog.create({
      user: req.body.updatedBy || 'System',
      action: 'update',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `Ödeme planı güncellendi`,
      institution: populatedPaymentPlan.institution._id,
      season: populatedPaymentPlan.season._id
    });

    res.json(populatedPaymentPlan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Process pending credit card payment
router.post('/:id/process-credit-card-payment', async (req, res) => {
  try {
    const { cashRegisterId, createdBy } = req.body;

    const paymentPlan = await PaymentPlan.findById(req.params.id)
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient');

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    if (paymentPlan.paymentType !== 'creditCard') {
      return res.status(400).json({ message: 'Bu ödeme planı kredi kartı ödemesi değil' });
    }

    if (!paymentPlan.isPendingPayment) {
      return res.status(400).json({ message: 'Bu ödeme zaten işlenmiş' });
    }

    const chargeAmount = paymentPlan.discountedAmount;
    const student = paymentPlan.student;

    // Create payment
    const payment = new Payment({
      student: paymentPlan.student._id,
      course: paymentPlan.course,
      enrollment: paymentPlan.enrollment,
      paymentPlan: paymentPlan._id,
      paymentType: 'creditCard',
      paymentMethod: 'creditCard',
      amount: chargeAmount,
      netAmount: chargeAmount,
      creditCardCommission: paymentPlan.creditCardCommission,
      creditCardInstallments: paymentPlan.creditCardInstallments,
      vat: paymentPlan.vat,
      isInvoiced: paymentPlan.isInvoiced,
      cashRegister: cashRegisterId,
      paymentDate: new Date(),
      season: paymentPlan.season,
      institution: paymentPlan.institution,
      status: 'completed',
      notes: `Kredi kartı ödemesi - ${paymentPlan.creditCardInstallments} taksit`,
      createdBy: createdBy
    });

    const savedPayment = await payment.save();

    // Update cash register balance
    await CashRegister.findByIdAndUpdate(cashRegisterId, {
      $inc: { balance: chargeAmount }
    });

    // Update student balance
    await Student.findByIdAndUpdate(paymentPlan.student._id, {
      $inc: { balance: -chargeAmount }
    });

    // Create commission expense
    if (paymentPlan.creditCardCommission && paymentPlan.creditCardCommission.amount > 0) {
      const commissionExpense = new Expense({
        category: 'Kredi Kartı Komisyonu',
        amount: paymentPlan.creditCardCommission.amount,
        description: `${student.firstName} ${student.lastName} - ${paymentPlan.creditCardInstallments} Taksit (%${paymentPlan.creditCardCommission.rate})`,
        expenseDate: new Date(),
        cashRegister: cashRegisterId,
        isAutoGenerated: true,
        relatedPayment: savedPayment._id,
        relatedStudent: paymentPlan.student._id,
        season: paymentPlan.season,
        institution: paymentPlan.institution,
        createdBy: createdBy
      });

      await commissionExpense.save();

      // Deduct commission from cash register
      await CashRegister.findByIdAndUpdate(cashRegisterId, {
        $inc: { balance: -paymentPlan.creditCardCommission.amount }
      });
    }

    // Create VAT expense if invoiced
    if (paymentPlan.isInvoiced && paymentPlan.vat && paymentPlan.vat.amount > 0) {
      const vatExpense = new Expense({
        category: 'KDV',
        amount: paymentPlan.vat.amount,
        description: `${student.firstName} ${student.lastName} - ${chargeAmount.toFixed(2)} TL üzerinden %${paymentPlan.vat.rate} KDV`,
        expenseDate: new Date(),
        cashRegister: cashRegisterId,
        isAutoGenerated: true,
        relatedPayment: savedPayment._id,
        relatedStudent: paymentPlan.student._id,
        season: paymentPlan.season,
        institution: paymentPlan.institution,
        createdBy: createdBy
      });

      await vatExpense.save();

      // Deduct VAT from cash register
      await CashRegister.findByIdAndUpdate(cashRegisterId, {
        $inc: { balance: -paymentPlan.vat.amount }
      });
    }

    // Mark installment as paid
    paymentPlan.installments.forEach(inst => {
      inst.isPaid = true;
      inst.paidAmount = inst.amount;
      inst.paidDate = new Date();
    });

    // Update payment plan
    paymentPlan.paidAmount = chargeAmount;
    paymentPlan.isCompleted = true;
    paymentPlan.isPendingPayment = false;
    await paymentPlan.save();

    // Log activity
    await ActivityLog.create({
      user: createdBy || 'System',
      action: 'update',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `Bekleyen kredi kartı ödemesi işlendi (${chargeAmount} TL)`,
      institution: paymentPlan.institution,
      season: paymentPlan.season
    });

    const populatedPaymentPlan = await PaymentPlan.findById(paymentPlan._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name');

    res.json(populatedPaymentPlan);
  } catch (error) {
    console.error('Error processing credit card payment:', error);
    res.status(400).json({ message: error.message });
  }
});

// Pay installment (for cash and credit card installment payments)
router.post('/:id/pay-installment', async (req, res) => {
  try {
    const {
      installmentNumber,
      amount,
      cashRegisterId,
      isInvoiced,
      paymentDate,
      vatRate,
      preConfiguredVat, // Pre-configured VAT amount from installment edit
      preConfiguredCommission, // Pre-configured commission amount
      preConfiguredCommissionRate, // Pre-configured commission rate
      installmentPaymentMethod, // Payment method from installment config
      installmentCreditCardInstallments, // Credit card installments from config
      overpaymentHandling, // 'next' or 'distribute'
      excessAmount
    } = req.body;

    const paymentPlan = await PaymentPlan.findById(req.params.id)
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient');

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    const installment = paymentPlan.installments.find(
      inst => inst.installmentNumber === installmentNumber
    );

    if (!installment) {
      return res.status(404).json({ message: 'Taksit bulunamadı' });
    }

    // Determine if this is a credit card payment - check both plan type and installment type
    const isCreditCardPayment = paymentPlan.paymentType === 'creditCard' ||
      installmentPaymentMethod === 'creditCard' ||
      installment.paymentMethod === 'creditCard';

    // Handle overpayment distribution
    let overpaymentNote = '';
    if (excessAmount > 0 && overpaymentHandling) {
      const remainingInstallments = paymentPlan.installments.filter(
        inst => !inst.isPaid && inst.installmentNumber !== installmentNumber
      );

      if (remainingInstallments.length > 0) {
        if (overpaymentHandling === 'next') {
          // Apply excess to next installment only
          const nextInstallment = remainingInstallments[0];
          nextInstallment.amount = Math.max(0, (nextInstallment.amount || 0) - excessAmount);
          overpaymentNote = ` (₺${excessAmount} fazla ödeme ${nextInstallment.installmentNumber}. taksite uygulandı)`;
        } else if (overpaymentHandling === 'distribute') {
          // Distribute excess across all remaining installments
          const excessPerInstallment = excessAmount / remainingInstallments.length;
          for (const inst of remainingInstallments) {
            inst.amount = Math.max(0, (inst.amount || 0) - excessPerInstallment);
          }
          overpaymentNote = ` (₺${excessAmount} fazla ödeme ${remainingInstallments.length} taksite dağıtıldı)`;
        }
      }
    }

    // Create payment
    const payment = new Payment({
      student: paymentPlan.student._id,
      course: paymentPlan.course,
      enrollment: paymentPlan.enrollment,
      paymentPlan: paymentPlan._id,
      paymentType: isCreditCardPayment ? 'creditCard' : 'cash',
      amount: amount,
      netAmount: amount,
      isInvoiced: isInvoiced,
      cashRegister: cashRegisterId,
      paymentDate: paymentDate || new Date(),
      installmentNumber: installmentNumber,
      season: paymentPlan.season,
      institution: paymentPlan.institution,
      status: 'completed', // Mark as completed immediately
      notes: `${installmentNumber}. taksit ödemesi${overpaymentNote}`,
      createdBy: req.body.createdBy
    });

    // Add credit card info if applicable
    if (isCreditCardPayment && paymentPlan.creditCardCommission) {
      payment.creditCardCommission = paymentPlan.creditCardCommission;
      payment.creditCardInstallments = paymentPlan.creditCardInstallments;
    }

    const savedPayment = await payment.save();

    // Update cash register balance
    await CashRegister.findByIdAndUpdate(cashRegisterId, {
      $inc: { balance: amount }
    });

    // Update student balance
    await Student.findByIdAndUpdate(paymentPlan.student._id, {
      $inc: { balance: -amount }
    });

    // Create credit card commission expense if this is a credit card payment
    // Check for pre-configured commission (per-installment) or plan-level commission
    const commissionAmount = preConfiguredCommission || installment.commission ||
      (paymentPlan.creditCardCommission && paymentPlan.creditCardCommission.amount) || 0;
    const commissionRate = preConfiguredCommissionRate || installment.commissionRate ||
      (paymentPlan.creditCardCommission && paymentPlan.creditCardCommission.rate) || 0;
    const ccInstallments = installmentCreditCardInstallments || installment.creditCardInstallments ||
      paymentPlan.creditCardInstallments || 1;

    if (isCreditCardPayment && commissionAmount > 0) {
      const commissionExpense = new Expense({
        category: 'Kredi Kartı Komisyonu',
        amount: commissionAmount,
        description: `${paymentPlan.student.firstName} ${paymentPlan.student.lastName} - ${installmentNumber}. taksit ${ccInstallments} Taksit (%${commissionRate})`,
        expenseDate: paymentDate || new Date(),
        cashRegister: cashRegisterId,
        isAutoGenerated: true,
        relatedPayment: savedPayment._id,
        relatedStudent: paymentPlan.student._id,
        season: paymentPlan.season,
        institution: paymentPlan.institution,
        createdBy: req.body.createdBy
      });

      await commissionExpense.save();

      // Deduct commission from cash register
      await CashRegister.findByIdAndUpdate(cashRegisterId, {
        $inc: { balance: -commissionAmount }
      });
    }

    // Create VAT expense if invoiced
    // Use pre-configured VAT from installment edit, or calculate if vatRate provided
    const vatAmount = preConfiguredVat || installment.vat ||
      (isInvoiced && vatRate ? (amount * vatRate) / 100 : 0);
    const effectiveVatRate = installment.vatRate || vatRate || 0;

    if (isInvoiced && vatAmount > 0) {
      const baseAmountForVat = installment.baseAmount || amount;
      const vatExpense = new Expense({
        category: 'KDV',
        amount: vatAmount,
        description: `${paymentPlan.student.firstName} ${paymentPlan.student.lastName} - ${installmentNumber}. taksit ${baseAmountForVat.toFixed(2)} TL üzerinden %${effectiveVatRate} KDV`,
        expenseDate: paymentDate || new Date(),
        cashRegister: cashRegisterId,
        isAutoGenerated: true,
        relatedPayment: savedPayment._id,
        relatedStudent: paymentPlan.student._id,
        season: paymentPlan.season,
        institution: paymentPlan.institution,
        createdBy: req.body.createdBy
      });

      await vatExpense.save();

      // Deduct VAT from cash register
      await CashRegister.findByIdAndUpdate(cashRegisterId, {
        $inc: { balance: -vatAmount }
      });
    }

    // Update installment
    installment.isPaid = true;
    installment.paidAmount = amount;
    installment.paidDate = paymentDate || new Date();
    installment.isInvoiced = isInvoiced;

    // Update payment plan totals
    paymentPlan.paidAmount = (paymentPlan.paidAmount || 0) + amount;
    paymentPlan.remainingAmount = paymentPlan.discountedAmount - paymentPlan.paidAmount;

    // Check if all installments are paid or remaining amounts are 0
    const allPaid = paymentPlan.installments.every(inst => inst.isPaid || inst.amount <= 0);
    if (allPaid || paymentPlan.remainingAmount <= 0) {
      paymentPlan.isCompleted = true;
      // Mark any zero-amount installments as paid
      for (const inst of paymentPlan.installments) {
        if (!inst.isPaid && inst.amount <= 0) {
          inst.isPaid = true;
          inst.paidAmount = 0;
          inst.paidDate = new Date();
        }
      }
    }

    await paymentPlan.save();

    // Log activity
    await ActivityLog.create({
      user: req.body.createdBy || 'System',
      action: 'update',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `${installmentNumber}. taksit ödendi (${amount} TL)${overpaymentNote}`,
      institution: paymentPlan.institution,
      season: paymentPlan.season
    });

    const populatedPaymentPlan = await PaymentPlan.findById(paymentPlan._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name');

    res.json(populatedPaymentPlan);
  } catch (error) {
    console.error('Error paying installment:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete payment plan
router.delete('/:id', async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findById(req.params.id);
    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    // Clean up related records before deleting payment plan
    // 1. Find all related payments
    const relatedPayments = await Payment.find({ paymentPlan: paymentPlan._id });

    for (const payment of relatedPayments) {
      // Only revert balance for non-refunded payments
      // Refunded payments have already had their balances reverted during refund
      if (payment.status !== 'refunded') {
        // Revert cash register balance
        if (payment.cashRegister) {
          await CashRegister.findByIdAndUpdate(payment.cashRegister, {
            $inc: { balance: -payment.amount }
          });
        }

        // Revert student balance (add back the debt they owed)
        if (payment.student) {
          await Student.findByIdAndUpdate(payment.student, {
            $inc: { balance: payment.amount }
          });
        }

        // Delete related expenses (commission, VAT) for non-refunded payments only
        const paymentExpenses = await Expense.find({ relatedPayment: payment._id, isAutoGenerated: true });
        for (const expense of paymentExpenses) {
          // Only revert if not a refund expense record
          if (expense.category !== 'Ödeme İadesi' && expense.cashRegister) {
            await CashRegister.findByIdAndUpdate(expense.cashRegister, {
              $inc: { balance: expense.amount }
            });
          }
        }
      }

      // Delete all expenses related to this payment (including refund records)
      await Expense.deleteMany({ relatedPayment: payment._id, isAutoGenerated: true });
    }

    // Delete all related payments
    await Payment.deleteMany({ paymentPlan: paymentPlan._id });

    // 2. Revert student balance (the initial debt added when payment plan was created)
    // This removes the total debt that was added when the plan was created
    if (paymentPlan.student) {
      await Student.findByIdAndUpdate(paymentPlan.student, {
        $inc: { balance: -paymentPlan.discountedAmount }
      });
    }

    // 3. Finally delete the payment plan
    await PaymentPlan.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.body?.deletedBy || 'System',
      action: 'delete',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `Ödeme planı ve ilgili kayıtlar silindi`,
      institution: paymentPlan.institution,
      season: paymentPlan.season
    });

    res.json({ message: 'Ödeme planı ve ilgili kayıtlar silindi' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Refund installment - FIXED VERSION
// Logic:
// 1. Find the original payment and mark as refunded
// 2. Reverse cash register balance (subtract the original income)
// 3. Find and reverse auto-generated expenses (VAT, commission)
// 4. Create a refund expense record for tracking
// 5. Update student balance (add back the debt)
// 6. Reset installment status
router.post('/:id/refund-installment', async (req, res) => {
  try {
    const { installmentNumber, refundReason, createdBy } = req.body;

    const paymentPlan = await PaymentPlan.findById(req.params.id)
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient');

    if (!paymentPlan) {
      return res.status(404).json({ message: 'Ödeme planı bulunamadı' });
    }

    const installment = paymentPlan.installments.find(
      inst => inst.installmentNumber === installmentNumber
    );

    if (!installment) {
      return res.status(404).json({ message: 'Taksit bulunamadı' });
    }

    if (!installment.isPaid) {
      return res.status(400).json({ message: 'Bu taksit henüz ödenmemiş' });
    }

    const refundAmount = installment.paidAmount || 0;
    let originalCashRegisterId = null;
    let reversedExpenses = [];

    // Find related payment for this installment (most recent non-refunded one)
    const relatedPayment = await Payment.findOne({
      paymentPlan: paymentPlan._id,
      installmentNumber: installmentNumber,
      status: { $ne: 'refunded' } // Exclude already refunded payments
    }).sort({ createdAt: -1 }); // Get the most recent one

    if (relatedPayment) {
      originalCashRegisterId = relatedPayment.cashRegister;

      // Mark payment as refunded (keep for audit trail)
      relatedPayment.isRefunded = true;
      relatedPayment.refundDate = new Date();
      relatedPayment.refundReason = refundReason || 'Taksit iadesi';
      relatedPayment.refundAmount = refundAmount;
      relatedPayment.status = 'refunded';
      await relatedPayment.save();

      // Step 1: Reverse cash register balance (subtract the original income)
      if (originalCashRegisterId) {
        await CashRegister.findByIdAndUpdate(originalCashRegisterId, {
          $inc: { balance: -refundAmount }
        });
      }

      // Step 2: Find and reverse auto-generated expenses (VAT, commission)
      const relatedExpenses = await Expense.find({
        relatedPayment: relatedPayment._id,
        isAutoGenerated: true
      });

      for (const expense of relatedExpenses) {
        reversedExpenses.push({
          category: expense.category,
          amount: expense.amount
        });

        // Add expense amount back to cash register (reverse the expense deduction)
        if (expense.cashRegister) {
          await CashRegister.findByIdAndUpdate(expense.cashRegister, {
            $inc: { balance: expense.amount }
          });
        }
        // Delete the expense record
        await Expense.findByIdAndDelete(expense._id);
      }

      // Step 3: Create a refund expense record for tracking
      // Note: This is informational - the balance was already adjusted above
      if (originalCashRegisterId) {
        const expenseDescription = reversedExpenses.length > 0
          ? `${paymentPlan.student.firstName} ${paymentPlan.student.lastName} - ${installmentNumber}. taksit iadesi (${reversedExpenses.map(e => `${e.category}: ₺${e.amount}`).join(', ')} iptal edildi)${refundReason ? ' - Sebep: ' + refundReason : ''}`
          : `${paymentPlan.student.firstName} ${paymentPlan.student.lastName} - ${installmentNumber}. taksit iadesi${refundReason ? ' - Sebep: ' + refundReason : ''}`;

        const refundExpense = new Expense({
          category: 'Ödeme İadesi',
          amount: refundAmount,
          description: expenseDescription,
          expenseDate: new Date(),
          cashRegister: originalCashRegisterId,
          isAutoGenerated: true,
          relatedPayment: relatedPayment._id,
          relatedStudent: paymentPlan.student._id || paymentPlan.student,
          season: paymentPlan.season,
          institution: paymentPlan.institution,
          createdBy: createdBy || 'System',
          notes: 'Bu kayıt iade işlemini belgeler. Kasa bakiyesi otomatik güncellendi.'
        });

        await refundExpense.save();
      }
    } else {
      // No payment record found - this shouldn't normally happen
      console.warn(`No payment found for installment ${installmentNumber} of payment plan ${paymentPlan._id}`);
    }

    // Step 4: Revert student balance (add back the debt they now owe again)
    await Student.findByIdAndUpdate(paymentPlan.student._id || paymentPlan.student, {
      $inc: { balance: refundAmount }
    });

    // Step 5: Reset installment status
    installment.isPaid = false;
    installment.paidAmount = 0;
    installment.paidDate = null;
    installment.isInvoiced = false;

    // Step 6: Update payment plan totals
    paymentPlan.paidAmount = Math.max(0, (paymentPlan.paidAmount || 0) - refundAmount);
    paymentPlan.remainingAmount = paymentPlan.discountedAmount - paymentPlan.paidAmount;
    paymentPlan.isCompleted = false;

    await paymentPlan.save();

    // Log activity
    await ActivityLog.create({
      user: createdBy || 'System',
      action: 'refund',
      entity: 'PaymentPlan',
      entityId: paymentPlan._id,
      description: `${installmentNumber}. taksit iade edildi (₺${refundAmount})${refundReason ? ' - Sebep: ' + refundReason : ''}`,
      institution: paymentPlan.institution,
      season: paymentPlan.season
    });

    const populatedPaymentPlan = await PaymentPlan.findById(paymentPlan._id)
      .populate('institution', 'name')
      .populate('season', 'name startDate endDate')
      .populate('student', 'firstName lastName phone email parentContacts defaultNotificationRecipient')
      .populate('course', 'name');

    res.json({
      message: `${installmentNumber}. taksit başarıyla iade edildi`,
      paymentPlan: populatedPaymentPlan,
      refundDetails: {
        amount: refundAmount,
        reversedExpenses: reversedExpenses
      }
    });
  } catch (error) {
    console.error('Error refunding installment:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
