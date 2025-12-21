import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Divider,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ArrowBack, ExpandMore, ExpandLess, Edit, CreditCard, Money, Receipt, WhatsApp, Email } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { format, addMonths, addDays, addWeeks } from 'date-fns';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { sendWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATES, replaceTemplateVariables } from '../utils/whatsappHelper';
import EmailDialog from '../components/Email/EmailDialog';

const PaymentPlan = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { institution, season, user } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [formData, setFormData] = useState({
    enrollmentId: '',
    courseType: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
    periodStartDate: new Date().toISOString().split('T')[0],
    periodEndDate: '',
    totalAmount: '',
    monthlyFee: '',
    durationMonths: '',
    discountType: 'none',
    discountValue: 0,
    paymentType: 'cashInstallment',
    installmentCount: 1,
    firstInstallmentDate: new Date(),
    paymentDate: new Date().toISOString().split('T')[0],
    installmentFrequency: 'monthly',
    customFrequencyDays: 30,
    description: '',
    partialPricingChoice: 'full',
  });
  const [courseLastLessonDate, setCourseLastLessonDate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [selectedCashRegister, setSelectedCashRegister] = useState('');
  const [monthlyLessonDetails, setMonthlyLessonDetails] = useState(null);
  const [showLessonDetails, setShowLessonDetails] = useState(true);
  const [showPartialPricingDialog, setShowPartialPricingDialog] = useState(false);
  const [showInstallmentDetails, setShowInstallmentDetails] = useState(true);

  // Price Calculator Helper State
  const [priceCalculator, setPriceCalculator] = useState({
    open: true,
    inputType: 'total', // 'total', 'monthly', 'perLesson'
    customTotal: '',
    customMonthly: '',
    customPerLesson: '',
    durationMonths: 9,
    lessonsPerMonth: 4,
    extraLessons: 0 // Ek dersler (8 ay + 2 ders gibi)
  });

  // Notification dialog state after plan creation
  const [successDialog, setSuccessDialog] = useState({
    open: false,
    planData: null,
    paymentPlanId: null
  });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Installment details state - each installment can have custom settings
  const [installmentDetails, setInstallmentDetails] = useState([]);

  useEffect(() => {
    // Validate required context values before loading
    if (!studentId) {
      setError('Öğrenci ID bulunamadı');
      return;
    }
    if (!season?._id) {
      setError('Sezon seçili değil');
      return;
    }
    if (!institution?._id) {
      setError('Kurum seçili değil');
      return;
    }
    loadData();
  }, [studentId, season?._id, institution?._id]);

  // Load message templates from DB
  useEffect(() => {
    if (institution?._id) {
      loadMessageTemplates();
    }
  }, [institution?._id]);

  const loadMessageTemplates = async () => {
    try {
      const response = await api.get('/message-templates', {
        params: { institution: institution._id }
      });
      setMessageTemplates(response.data);
    } catch (error) {
      console.error('Error loading message templates:', error);
    }
  };

  // Get template content from DB or fallback to default
  const getTemplateContent = (templateType) => {
    const dbTemplate = messageTemplates.find(t => t.type === templateType);
    if (dbTemplate) return dbTemplate.template;
    return DEFAULT_WHATSAPP_TEMPLATES[templateType] || DEFAULT_WHATSAPP_TEMPLATES.general;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate studentId format (MongoDB ObjectId is 24 hex characters)
      if (!studentId || !/^[a-fA-F0-9]{24}$/.test(studentId)) {
        setError('Geçersiz öğrenci ID formatı');
        setLoading(false);
        return;
      }

      const [studentRes, enrollmentsRes, cashRes, settingsRes] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get('/enrollments', { params: { studentId, seasonId: season._id } }),
        api.get('/cash-registers', { params: { institution: institution._id } }),
        api.get('/settings', { params: { institutionId: institution._id } }),
      ]);

      // Validate student data
      if (!studentRes.data || !studentRes.data._id) {
        setError('Öğrenci bulunamadı. Lütfen geçerli bir öğrenci seçin.');
        setLoading(false);
        return;
      }

      setStudent(studentRes.data);
      setEnrollments(enrollmentsRes.data || []);
      setCashRegisters(cashRes.data || []);

      if (cashRes.data && cashRes.data.length > 0) {
        setSelectedCashRegister(cashRes.data[0]._id);
      }

      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings(settingsRes.data[0]);
      }

      if (enrollmentsRes.data && enrollmentsRes.data.length > 0) {
        await handleEnrollmentChange(enrollmentsRes.data[0]._id, enrollmentsRes.data);
      }
    } catch (error) {
      console.error('PaymentPlan loadData error:', error);
      if (error.response?.status === 404) {
        setError('Öğrenci bulunamadı. Bu ID ile kayıtlı öğrenci yok.');
      } else {
        setError(error.response?.data?.message || 'Veri yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCreditCardCommissionRate = useCallback((installmentCount) => {
    if (!settings || !settings.creditCardRates) return 0;
    const rateObj = settings.creditCardRates.find(r => r.installments === installmentCount);
    return rateObj ? rateObj.rate : 0;
  }, [settings]);

  const getVatRate = () => settings?.vatRate || 10;

  const calculateMonthlyLessonDetails = async (enrollmentId, durationMonths, enrollmentsList = null, customEnrollmentDate = null) => {
    if (!enrollmentId || !durationMonths || durationMonths <= 0) {
      setMonthlyLessonDetails(null);
      return;
    }

    try {
      const enrollmentsToUse = enrollmentsList || enrollments;
      const enrollment = enrollmentsToUse.find(e => e._id === enrollmentId);

      if (!enrollment || !enrollment.course || enrollment.course.pricingType !== 'monthly') {
        setMonthlyLessonDetails(null);
        return;
      }

      // customEnrollmentDate varsa onu kullan (async state güncelleme sorunu için)
      const enrollmentDateToUse = customEnrollmentDate || formData.enrollmentDate;

      const response = await api.post('/courses/calculate-monthly-lessons', {
        courseId: enrollment.course._id,
        studentId: studentId,  // Pass studentId for birebir (one-on-one) lesson filtering
        startDate: enrollmentDateToUse,
        durationMonths: parseInt(durationMonths),
        enrollmentDate: enrollmentDateToUse
      });

      setMonthlyLessonDetails(response.data);

      // For birebir courses, auto-adjust duration and total based on actual lessons
      if (response.data.isBirebir && response.data.birebirLessonsInfo) {
        const { totalLessons, actualMonthsSpan } = response.data.birebirLessonsInfo;
        const pricePerLesson = response.data.course?.pricePerLesson || 0;
        const recommendedTotal = response.data.pricing?.totalByPerLesson || (totalLessons * pricePerLesson);

        // Auto-update form with birebir-specific values
        if (actualMonthsSpan !== parseInt(durationMonths)) {
          setFormData(prev => ({
            ...prev,
            durationMonths: actualMonthsSpan,
            totalAmount: recommendedTotal
          }));

          // Recalculate with correct duration
          const recalculateResponse = await api.post('/courses/calculate-monthly-lessons', {
            courseId: enrollment.course._id,
            studentId: studentId,
            startDate: enrollmentDateToUse,
            durationMonths: actualMonthsSpan,
            enrollmentDate: enrollmentDateToUse
          });
          setMonthlyLessonDetails(recalculateResponse.data);
        } else {
          // Just update the total amount
          setFormData(prev => ({
            ...prev,
            totalAmount: recommendedTotal
          }));
        }
      }

      if (response.data.firstMonthPartial && response.data.pricing.hasPartialOption && !response.data.isBirebir) {
        setShowPartialPricingDialog(true);
      }
    } catch (error) {
      console.error('Error calculating monthly lessons:', error);
      setMonthlyLessonDetails(null);
    }
  };

  const handleEnrollmentChange = async (enrollmentId, enrollmentsList = null) => {
    const enrollmentsToUse = enrollmentsList || enrollments;
    const selectedEnrollment = enrollmentsToUse.find(e => e._id === enrollmentId);

    if (!selectedEnrollment || !selectedEnrollment.course) return;

    const course = selectedEnrollment.course;
    const isMonthly = course.pricingType === 'monthly';

    let priceValue = '';
    if (isMonthly && course.pricePerMonth) {
      priceValue = course.pricePerMonth;
    } else if (!isMonthly && course.pricePerLesson) {
      priceValue = course.pricePerLesson;
    }

    let suggestedMonths = '';
    if (season && season.endDate) {
      const now = new Date();
      const endDate = new Date(season.endDate);
      const monthsDiff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30));
      if (monthsDiff > 0) suggestedMonths = monthsDiff;
    }

    let calculatedTotal = '';
    if (isMonthly) {
      calculatedTotal = priceValue && suggestedMonths ? priceValue * suggestedMonths : priceValue;
    } else {
      calculatedTotal = priceValue;
    }

    // Get the enrollment date BEFORE setting state (async issue fix)
    const newEnrollmentDate = selectedEnrollment.enrollmentDate
      ? new Date(selectedEnrollment.enrollmentDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Fetch course's last lesson date for default period end date
    let lastLessonDate = season?.endDate ? new Date(season.endDate).toISOString().split('T')[0] : '';
    try {
      const lastLessonRes = await api.get('/scheduled-lessons/last-lesson', {
        params: {
          courseId: course._id,
          seasonId: season._id,
          institutionId: institution._id
        }
      });
      if (lastLessonRes.data && lastLessonRes.data.date) {
        lastLessonDate = new Date(lastLessonRes.data.date).toISOString().split('T')[0];
        setCourseLastLessonDate(lastLessonDate);
      }
    } catch (error) {
      console.log('Could not fetch last lesson date, using season end date');
      setCourseLastLessonDate(null);
    }

    setFormData((prev) => ({
      ...prev,
      enrollmentId,
      courseType: isMonthly ? 'monthly' : 'perLesson',
      enrollmentDate: newEnrollmentDate,
      periodStartDate: newEnrollmentDate,
      periodEndDate: lastLessonDate,
      monthlyFee: isMonthly ? priceValue : '',
      totalAmount: calculatedTotal,
      durationMonths: suggestedMonths
    }));

    if (isMonthly && suggestedMonths > 0) {
      // Pass the enrollment date explicitly to avoid async state issue
      await calculateMonthlyLessonDetails(enrollmentId, suggestedMonths, enrollmentsToUse, newEnrollmentDate);
    } else {
      setMonthlyLessonDetails(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'enrollmentId' && value) {
      handleEnrollmentChange(value);
      return;
    }

    if (name === 'durationMonths' && value && formData.monthlyFee) {
      const newTotal = formData.monthlyFee * parseFloat(value);
      setFormData((prev) => ({ ...prev, [name]: value, totalAmount: newTotal }));

      if (formData.enrollmentId && value > 0) {
        const selectedEnrollment = enrollments.find(e => e._id === formData.enrollmentId);
        if (selectedEnrollment?.course?.pricingType === 'monthly') {
          calculateMonthlyLessonDetails(formData.enrollmentId, value);
        }
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate base amount after discount
  const baseAmount = useMemo(() => {
    const totalAmount = parseFloat(formData.totalAmount) || 0;
    let discountAmount = 0;
    if (formData.discountType === 'fullScholarship') {
      discountAmount = totalAmount;
    } else if (formData.discountType === 'percentage') {
      discountAmount = (totalAmount * parseFloat(formData.discountValue)) / 100;
    } else if (formData.discountType === 'fixed') {
      discountAmount = parseFloat(formData.discountValue) || 0;
    }
    return totalAmount - discountAmount;
  }, [formData.totalAmount, formData.discountType, formData.discountValue]);

  // Generate/update installment details when relevant fields change
  useEffect(() => {
    if (formData.paymentType === 'cashFull' || formData.paymentType === 'creditCard') {
      // Single payment - one installment
      const paymentMethod = formData.paymentType === 'creditCard' ? 'creditCard' : 'cash';
      setInstallmentDetails([{
        installmentNumber: 1,
        amount: baseAmount,
        dueDate: formData.paymentType === 'creditCard'
          ? new Date(formData.paymentDate)
          : new Date(formData.firstInstallmentDate),
        paymentMethod: paymentMethod,
        isInvoiced: false,
        isCustomAmount: false,
        creditCardInstallments: formData.paymentType === 'creditCard' ? parseInt(formData.installmentCount) || 1 : 1
      }]);
    } else if (formData.paymentType === 'cashInstallment') {
      const count = parseInt(formData.installmentCount) || 1;
      const startDate = new Date(formData.firstInstallmentDate);

      // Keep existing custom amounts if count matches
      if (installmentDetails.length === count && installmentDetails.every(d => d.paymentMethod !== 'creditCard')) {
        // Just update dates if needed
        return;
      }

      const perInstallment = baseAmount / count;
      const newDetails = [];

      for (let i = 0; i < count; i++) {
        let dueDate = new Date(startDate);
        if (formData.installmentFrequency === 'weekly') {
          dueDate = addWeeks(startDate, i);
        } else if (formData.installmentFrequency === 'custom') {
          dueDate = addDays(startDate, i * parseInt(formData.customFrequencyDays || 30));
        } else {
          dueDate = addMonths(startDate, i);
        }

        newDetails.push({
          installmentNumber: i + 1,
          amount: perInstallment,
          dueDate,
          paymentMethod: 'cash',
          isInvoiced: false,
          isCustomAmount: false,
          creditCardInstallments: 1
        });
      }
      setInstallmentDetails(newDetails);
    }
  }, [formData.paymentType, formData.installmentCount, formData.firstInstallmentDate,
      formData.installmentFrequency, formData.customFrequencyDays, formData.paymentDate, baseAmount]);

  // Handle installment amount change with auto-redistribution
  const handleInstallmentAmountChange = (index, newAmount) => {
    const amount = parseFloat(newAmount) || 0;
    const updated = [...installmentDetails];
    updated[index] = { ...updated[index], amount, isCustomAmount: true };

    // Calculate remaining amount for non-custom installments
    const customTotal = updated.reduce((sum, inst, i) =>
      inst.isCustomAmount ? sum + inst.amount : sum, 0);
    const remaining = baseAmount - customTotal;
    const nonCustomCount = updated.filter(inst => !inst.isCustomAmount).length;

    if (nonCustomCount > 0 && remaining >= 0) {
      const perNonCustom = remaining / nonCustomCount;
      updated.forEach((inst, i) => {
        if (!inst.isCustomAmount) {
          updated[i] = { ...inst, amount: perNonCustom };
        }
      });
    }

    setInstallmentDetails(updated);
  };

  // Handle installment payment method change
  const handleInstallmentPaymentMethodChange = (index, method) => {
    const updated = [...installmentDetails];
    updated[index] = {
      ...updated[index],
      paymentMethod: method,
      creditCardInstallments: method === 'creditCard' ? 1 : updated[index].creditCardInstallments
    };
    setInstallmentDetails(updated);
  };

  // Handle installment invoiced change
  const handleInstallmentInvoicedChange = (index, isInvoiced) => {
    const updated = [...installmentDetails];
    updated[index] = {
      ...updated[index],
      isInvoiced,
      // Set default VAT rate from settings when invoiced is enabled
      customVatRate: isInvoiced ? (updated[index].customVatRate || settings?.vatRate || 10) : undefined
    };
    setInstallmentDetails(updated);
  };

  // Handle installment VAT rate change
  const handleInstallmentVatRateChange = (index, rate) => {
    const updated = [...installmentDetails];
    updated[index] = { ...updated[index], customVatRate: parseFloat(rate) || 0 };
    setInstallmentDetails(updated);
  };

  // Handle installment commission rate change (for credit card)
  const handleInstallmentCommissionRateChange = (index, rate) => {
    const updated = [...installmentDetails];
    updated[index] = { ...updated[index], customCommissionRate: parseFloat(rate) || 0 };
    setInstallmentDetails(updated);
  };

  // Handle installment date change
  const handleInstallmentDateChange = (index, date) => {
    const updated = [...installmentDetails];
    updated[index] = { ...updated[index], dueDate: date };
    setInstallmentDetails(updated);
  };

  // Handle credit card installments change for a specific installment
  const handleInstallmentCCCountChange = (index, count) => {
    const updated = [...installmentDetails];
    updated[index] = { ...updated[index], creditCardInstallments: parseInt(count) || 1 };
    setInstallmentDetails(updated);
  };

  // Reset custom amount for an installment
  const resetInstallmentAmount = (index) => {
    const updated = [...installmentDetails];
    updated[index] = { ...updated[index], isCustomAmount: false };

    // Recalculate all non-custom amounts
    const customTotal = updated.reduce((sum, inst) =>
      inst.isCustomAmount ? sum + inst.amount : sum, 0);
    const remaining = baseAmount - customTotal;
    const nonCustomCount = updated.filter(inst => !inst.isCustomAmount).length;

    if (nonCustomCount > 0) {
      const perNonCustom = remaining / nonCustomCount;
      updated.forEach((inst, i) => {
        if (!inst.isCustomAmount) {
          updated[i] = { ...inst, amount: perNonCustom };
        }
      });
    }

    setInstallmentDetails(updated);
  };

  // Calculate totals including commission per installment (VAT is NOT added to student payment)
  const calculatedInstallments = useMemo(() => {
    return installmentDetails.map(inst => {
      let commission = 0;
      let commissionRate = 0;
      if (inst.paymentMethod === 'creditCard') {
        // Use custom commission rate if set, otherwise use settings rate
        commissionRate = inst.customCommissionRate !== undefined
          ? inst.customCommissionRate
          : getCreditCardCommissionRate(inst.creditCardInstallments);
        commission = (inst.amount * commissionRate) / 100;
      }

      // Total that student pays = base amount + commission (VAT is NOT added)
      const total = inst.amount + commission;

      // VAT is calculated for expense tracking only, not added to student's payment
      // Use custom VAT rate if set, otherwise use settings rate
      const vatRate = inst.customVatRate !== undefined ? inst.customVatRate : getVatRate();
      const vat = inst.isInvoiced ? (total * vatRate) / 100 : 0;

      return {
        ...inst,
        commission,
        commissionRate,
        vat,
        vatRate: inst.isInvoiced ? vatRate : 0,
        total
      };
    });
  }, [installmentDetails, getCreditCardCommissionRate, settings]);

  // Grand totals
  const grandTotals = useMemo(() => {
    const totals = calculatedInstallments.reduce((acc, inst) => ({
      baseAmount: acc.baseAmount + inst.amount,
      commission: acc.commission + inst.commission,
      vat: acc.vat + inst.vat,
      total: acc.total + inst.total
    }), { baseAmount: 0, commission: 0, vat: 0, total: 0 });

    return {
      ...totals,
      totalAmount: parseFloat(formData.totalAmount) || 0,
      discountAmount: (parseFloat(formData.totalAmount) || 0) - baseAmount
    };
  }, [calculatedInstallments, formData.totalAmount, baseAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const selectedEnrollment = enrollments.find(e => e._id === formData.enrollmentId);
      if (!selectedEnrollment) {
        setError('Lütfen bir ders seçin');
        setLoading(false);
        return;
      }

      // Check if any installment needs cash register
      const hasCreditCard = calculatedInstallments.some(inst => inst.paymentMethod === 'creditCard');
      if (hasCreditCard && !selectedCashRegister) {
        setError('Kredi kartı ödemesi için lütfen bir kasa seçin');
        setLoading(false);
        return;
      }

      // Build installments for backend
      const installments = calculatedInstallments.map((inst, index) => ({
        installmentNumber: index + 1,
        amount: inst.total, // Total including commission and VAT
        baseAmount: inst.amount,
        commission: inst.commission,
        commissionRate: inst.commissionRate,
        vat: inst.vat,
        vatRate: inst.vatRate,
        dueDate: inst.dueDate,
        isPaid: false,
        paidAmount: 0,
        isInvoiced: inst.isInvoiced,
        paymentMethod: inst.paymentMethod,
        creditCardInstallments: inst.paymentMethod === 'creditCard' ? inst.creditCardInstallments : undefined
      }));

      const paymentPlanData = {
        student: studentId,
        enrollment: formData.enrollmentId,
        course: selectedEnrollment.course._id,
        paymentType: formData.paymentType,
        totalAmount: grandTotals.totalAmount,
        discountedAmount: grandTotals.total,
        discountType: formData.discountType,
        discountValue: formData.discountType === 'fullScholarship' ? 100 : parseFloat(formData.discountValue) || 0,
        installments,
        institution: institution._id,
        season: season._id,
        notes: formData.description,
        createdBy: user?.username || 'System',
        cashRegister: hasCreditCard ? selectedCashRegister : undefined,
        // IMPORTANT: Send enrollmentDate to update the enrollment record
        enrollmentDate: formData.enrollmentDate,
        // Period dates for proper report calculation
        periodStartDate: formData.periodStartDate,
        periodEndDate: formData.periodEndDate
      };

      const response = await api.post('/payment-plans', paymentPlanData);

      // Validate response
      if (!response.data || !response.data._id) {
        setError('Ödeme planı oluşturuldu ancak yanıt alınamadı. Lütfen sayfayı yenileyip kontrol edin.');
        setLoading(false);
        return;
      }

      const paymentPlanId = response.data._id;
      console.log('Payment plan created successfully:', paymentPlanId);

      // Navigate directly to payment plan detail page
      // This is more reliable than showing a dialog
      setLoading(false);
      navigate(`/payment-plan-detail/${paymentPlanId}`);
    } catch (error) {
      console.error('Payment plan creation error:', error);
      setError(error.response?.data?.message || 'Ödeme planı oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Get notification recipient based on student preferences
  const getNotificationRecipient = () => {
    if (!successDialog.planData) return { phone: null, recipientName: '', email: null };

    const { studentName, phone, email, parentContacts, defaultNotificationRecipient } = successDialog.planData;
    const recipient = defaultNotificationRecipient || 'student';
    const mother = parentContacts?.find(p => p.relationship === 'Anne');
    const father = parentContacts?.find(p => p.relationship === 'Baba');

    let selectedPhone = null;
    let selectedEmail = null;
    let recipientName = studentName;
    let isParent = false;

    switch (recipient) {
      case 'mother':
        selectedPhone = mother?.phone;
        selectedEmail = mother?.email;
        if (mother?.name) {
          recipientName = mother.name;
          isParent = true;
        }
        break;
      case 'father':
        selectedPhone = father?.phone;
        selectedEmail = father?.email;
        if (father?.name) {
          recipientName = father.name;
          isParent = true;
        }
        break;
      default:
        selectedPhone = phone;
        selectedEmail = email;
        break;
    }

    // Fallback
    if (!selectedPhone) {
      selectedPhone = phone || mother?.phone || father?.phone;
    }
    if (!selectedEmail) {
      selectedEmail = email || mother?.email || father?.email;
    }

    return { phone: selectedPhone, email: selectedEmail, recipientName, isParent, studentName };
  };

  // Handle WhatsApp notification after plan creation
  const handleWhatsAppNotification = () => {
    const { phone, recipientName, isParent, studentName } = getNotificationRecipient();
    const planData = successDialog.planData;

    if (!phone) {
      alert('Telefon numarası bulunamadı');
      return;
    }

    // Build monthly schedule (installment list)
    const monthlySchedule = planData.installments.map(inst =>
      `• ${inst.installmentNumber}. Taksit: ${new Date(inst.dueDate).toLocaleDateString('tr-TR')} - ${inst.amount?.toLocaleString('tr-TR')} TL`
    ).join('\n');

    // Build lessons per month info from monthlyLessonDetails if available
    const lessonsPerMonth = monthlyLessonDetails
      ? monthlyLessonDetails.map(m => `• ${m.month}: ${m.lessonCount} ders - ${m.fee.toLocaleString('tr-TR')} TL`).join('\n')
      : '';

    const templateData = {
      recipientName,
      studentName: isParent ? studentName : recipientName,
      courseName: planData.courseName,
      seasonName: planData.seasonName,
      totalAmount: planData.totalAmount,
      totalInstallments: planData.totalInstallments,
      installmentCount: planData.installmentCount,
      installmentAmount: planData.installmentAmount,
      paymentMethod: planData.paymentMethod,
      commissionAmount: planData.commissionAmount,
      monthlySchedule,
      lessonsPerMonth,
      institutionName: institution?.name || 'Kurum'
    };

    const template = getTemplateContent('paymentPlanCreated');
    const message = replaceTemplateVariables(template, templateData);

    sendWhatsAppMessage(phone, message, {});
    const planId = successDialog.paymentPlanId;
    setSuccessDialog({ open: false, planData: null, paymentPlanId: null });
    if (planId) {
      navigate(`/payment-plan-detail/${planId}`);
    } else {
      navigate(`/students/${studentId}`);
    }
  };

  // Handle Email notification after plan creation
  const handleEmailNotification = () => {
    setEmailDialogOpen(true);
    // Keep paymentPlanId for navigation after email sent
  };

  // Get email template data
  const getEmailTemplateData = () => {
    if (!successDialog.planData) return {};
    const { recipientName, isParent, studentName } = getNotificationRecipient();
    const planData = successDialog.planData;

    const monthlySchedule = planData.installments.map(inst =>
      `• ${inst.installmentNumber}. Taksit: ${new Date(inst.dueDate).toLocaleDateString('tr-TR')} - ${inst.amount?.toLocaleString('tr-TR')} TL`
    ).join('\n');

    const lessonsPerMonth = monthlyLessonDetails
      ? monthlyLessonDetails.map(m => `• ${m.month}: ${m.lessonCount} ders - ${m.fee.toLocaleString('tr-TR')} TL`).join('\n')
      : '';

    return {
      recipientName,
      studentName: isParent ? studentName : recipientName,
      courseName: planData.courseName,
      seasonName: planData.seasonName,
      totalAmount: planData.totalAmount,
      totalInstallments: planData.totalInstallments,
      installmentCount: planData.installmentCount,
      installmentAmount: planData.installmentAmount,
      paymentMethod: planData.paymentMethod,
      commissionAmount: planData.commissionAmount,
      monthlySchedule,
      lessonsPerMonth,
      institutionName: institution?.name || 'Kurum'
    };
  };

  if (loading && !student) {
    return <LoadingSpinner message="Yükleniyor..." />;
  }

  const selectedEnrollment = enrollments.find(e => e._id === formData.enrollmentId);
  const course = selectedEnrollment?.course;

  // Use formData.monthlyFee for calculations (real-time update)
  const currentMonthlyFee = parseFloat(formData.monthlyFee) || 0;
  const pricePerLesson = monthlyLessonDetails?.course?.pricePerLesson || course?.pricePerLesson || 0;
  // Calculate price per lesson based on current monthly fee
  const calculatedPricePerLesson = monthlyLessonDetails?.course?.lessonsPerMonth
    ? currentMonthlyFee / monthlyLessonDetails.course.lessonsPerMonth
    : pricePerLesson;

  return (
    <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 }, pb: { xs: 10, md: 2 } }}>
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Button size={isMobile ? 'small' : 'medium'} startIcon={<ArrowBack />} onClick={() => navigate(`/students/${studentId}`)}>
          Geri
        </Button>
      </Box>

      <Grid container spacing={{ xs: 1.5, md: 3 }}>
        {/* Sol Panel - Form */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom>
              Ödeme Planı Oluştur
            </Typography>

            {student && (
              <Box sx={{ mb: { xs: 2, md: 3 }, p: { xs: 1.5, md: 2 }, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">{student.firstName} {student.lastName}</Typography>
                <Typography variant="body2">
                  Mevcut Bakiye: <strong>₺{Math.abs(student.balance || 0).toLocaleString('tr-TR')}</strong>
                </Typography>
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {enrollments.length === 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Bu öğrenci henüz hiçbir derse kayıtlı değil.
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* Ders Seçimi */}
                <Grid item xs={12}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Ders</InputLabel>
                    <Select name="enrollmentId" value={formData.enrollmentId} onChange={handleChange} label="Ders">
                      {enrollments.map((enrollment) => (
                        <MenuItem key={enrollment._id} value={enrollment._id}>
                          {enrollment.course?.name || 'İsimsiz Ders'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Aylık Kurs Alanları */}
                {formData.courseType === 'monthly' && (
                  <>
                    <Grid item xs={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="Kayıt Tarihi"
                          value={formData.enrollmentDate ? new Date(formData.enrollmentDate) : null}
                          onChange={(date) => {
                            if (date && !isNaN(date.getTime())) {
                              const newEnrollmentDate = date.toISOString().split('T')[0];
                              setFormData(prev => ({ ...prev, enrollmentDate: newEnrollmentDate }));
                              if (formData.enrollmentId && formData.durationMonths > 0) {
                                calculateMonthlyLessonDetails(formData.enrollmentId, formData.durationMonths, null, newEnrollmentDate);
                              }
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={6}>
                      {monthlyLessonDetails?.isBirebir ? (
                        <TextField
                          fullWidth size="small"
                          label="Ders Başı Ücret (₺)"
                          type="number"
                          value={monthlyLessonDetails.course?.pricePerLesson || 0}
                          InputProps={{ readOnly: true }}
                          helperText={`${monthlyLessonDetails.birebirLessonsInfo?.totalLessons || 0} ders`}
                          sx={{ '& .MuiInputBase-input': { fontWeight: 600, color: 'secondary.main' } }}
                        />
                      ) : (
                        <TextField
                          fullWidth size="small"
                          label="Aylık Ücret (₺)"
                          name="monthlyFee"
                          type="number"
                          value={formData.monthlyFee}
                          onChange={(e) => {
                            const newMonthlyFee = parseFloat(e.target.value) || 0;
                            const newTotal = formData.durationMonths ? newMonthlyFee * parseFloat(formData.durationMonths) : newMonthlyFee;
                            setFormData(prev => ({ ...prev, monthlyFee: e.target.value, totalAmount: newTotal }));
                          }}
                        />
                      )}
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small"
                        label="Süre (Ay)"
                        name="durationMonths"
                        type="number"
                        value={formData.durationMonths}
                        onChange={handleChange}
                        inputProps={{ min: 1 }}
                        InputProps={monthlyLessonDetails?.isBirebir ? { readOnly: true } : {}}
                        helperText={monthlyLessonDetails?.isBirebir ? 'Birebir derslerde süre otomatik hesaplanır' : ''}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small"
                        label="Toplam (₺)"
                        value={formData.totalAmount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInputBase-input': { fontWeight: 600, color: 'primary.main' } }}
                      />
                    </Grid>

                    {/* Dönem Aralığı */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 1 }}>
                        Ödeme Planı Dönemi (Bu plan hangi tarih aralığını kapsar?)
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="Dönem Başlangıç"
                          value={formData.periodStartDate ? new Date(formData.periodStartDate) : null}
                          onChange={(date) => {
                            if (date && !isNaN(date.getTime())) {
                              setFormData(prev => ({ ...prev, periodStartDate: date.toISOString().split('T')[0] }));
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              helperText: 'Genellikle kayıt tarihi'
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="Dönem Bitiş"
                          value={formData.periodEndDate ? new Date(formData.periodEndDate) : null}
                          onChange={(date) => {
                            if (date && !isNaN(date.getTime())) {
                              setFormData(prev => ({ ...prev, periodEndDate: date.toISOString().split('T')[0] }));
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              helperText: courseLastLessonDate ? `Son ders: ${new Date(courseLastLessonDate).toLocaleDateString('tr-TR')}` : 'Sezon sonu'
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </>
                )}

                {/* Ders Başı Fiyatlama */}
                {formData.courseType === 'perLesson' && (
                  <>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small"
                        label="Toplam Tutar (₺)"
                        name="totalAmount"
                        type="number"
                        value={formData.totalAmount}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small"
                        label="Süre (Ay)"
                        name="durationMonths"
                        type="number"
                        value={formData.durationMonths}
                        onChange={handleChange}
                      />
                    </Grid>

                    {/* Dönem Aralığı */}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, mt: 1 }}>
                        Ödeme Planı Dönemi (Bu plan hangi tarih aralığını kapsar?)
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="Dönem Başlangıç"
                          value={formData.periodStartDate ? new Date(formData.periodStartDate) : null}
                          onChange={(date) => {
                            if (date && !isNaN(date.getTime())) {
                              setFormData(prev => ({ ...prev, periodStartDate: date.toISOString().split('T')[0] }));
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              helperText: 'Genellikle kayıt tarihi'
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="Dönem Bitiş"
                          value={formData.periodEndDate ? new Date(formData.periodEndDate) : null}
                          onChange={(date) => {
                            if (date && !isNaN(date.getTime())) {
                              setFormData(prev => ({ ...prev, periodEndDate: date.toISOString().split('T')[0] }));
                            }
                          }}
                          slotProps={{
                            textField: {
                              size: 'small',
                              fullWidth: true,
                              helperText: courseLastLessonDate ? `Son ders: ${new Date(courseLastLessonDate).toLocaleDateString('tr-TR')}` : 'Sezon sonu'
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                {/* İndirim */}
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>İndirim</InputLabel>
                    <Select name="discountType" value={formData.discountType} onChange={handleChange} label="İndirim">
                      <MenuItem value="none">İndirimsiz</MenuItem>
                      <MenuItem value="fullScholarship">Tam Burslu (%100)</MenuItem>
                      <MenuItem value="percentage">Yüzde (%)</MenuItem>
                      <MenuItem value="fixed">Tutar (₺)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {formData.discountType !== 'none' && formData.discountType !== 'fullScholarship' && (
                  <Grid item xs={6}>
                    <TextField
                      fullWidth size="small"
                      label={formData.discountType === 'percentage' ? 'İndirim (%)' : 'İndirim (₺)'}
                      name="discountValue"
                      type="number"
                      value={formData.discountValue}
                      onChange={handleChange}
                    />
                  </Grid>
                )}

                {/* Ödeme Tipi */}
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Ödeme Şekli</InputLabel>
                    <Select name="paymentType" value={formData.paymentType} onChange={handleChange} label="Ödeme Şekli">
                      <MenuItem value="cashFull">Tek Seferde</MenuItem>
                      <MenuItem value="cashInstallment">Taksitli</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Taksitli Ödeme Alanları */}
                {formData.paymentType === 'cashInstallment' && (
                  <>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Taksit Sayısı</InputLabel>
                        <Select
                          name="installmentCount"
                          value={formData.installmentCount}
                          onChange={handleChange}
                          label="Taksit Sayısı"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                            <MenuItem key={num} value={num}>{num} Taksit</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Ödeme Sıklığı</InputLabel>
                        <Select name="installmentFrequency" value={formData.installmentFrequency} onChange={handleChange} label="Ödeme Sıklığı">
                          <MenuItem value="monthly">Aylık</MenuItem>
                          <MenuItem value="weekly">Haftalık</MenuItem>
                          <MenuItem value="custom">Özel</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="İlk Taksit Tarihi"
                          value={formData.firstInstallmentDate}
                          onChange={(date) => setFormData({ ...formData, firstInstallmentDate: date })}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    {formData.installmentFrequency === 'custom' && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth size="small"
                          label="Kaç günde bir?"
                          name="customFrequencyDays"
                          type="number"
                          value={formData.customFrequencyDays}
                          onChange={handleChange}
                        />
                      </Grid>
                    )}
                  </>
                )}

                {/* Tek Seferde Ödeme için tarih */}
                {formData.paymentType === 'cashFull' && (
                  <Grid item xs={12}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                      <DatePicker
                        label="Ödeme Tarihi"
                        value={formData.firstInstallmentDate}
                        onChange={(date) => setFormData({ ...formData, firstInstallmentDate: date })}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    </LocalizationProvider>
                  </Grid>
                )}

                {/* Kasa Seçimi - Kredi kartı taksiti varsa göster */}
                {calculatedInstallments.some(inst => inst.paymentMethod === 'creditCard') && (
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Kasa (Kredi Kartı için)</InputLabel>
                      <Select
                        value={selectedCashRegister}
                        onChange={(e) => setSelectedCashRegister(e.target.value)}
                        label="Kasa (Kredi Kartı için)"
                      >
                        {cashRegisters.map((r) => (
                          <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth size="small"
                    label="Açıklama (Opsiyonel)"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading || enrollments.length === 0}
                  >
                    {loading ? 'Oluşturuluyor...' : 'Ödeme Planı Oluştur'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {/* Sağ Panel - Özet */}
        <Grid item xs={12} md={5}>
          {/* Fiyat Hesaplama Yardımcısı */}
          <Card sx={{ mb: { xs: 1.5, md: 2 }, border: '2px dashed', borderColor: 'info.main' }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setPriceCalculator(prev => ({ ...prev, open: !prev.open }))}
              >
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🧮 Fiyat Hesaplama
                </Typography>
                <IconButton size="small">
                  {priceCalculator.open ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={priceCalculator.open}>
                <Box sx={{ mt: 2 }}>
                  {/* Default Values Info */}
                  {course && (
                    <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                      <Typography variant="caption">
                        <strong>Varsayılan:</strong> Aylık {course.pricePerMonth?.toLocaleString('tr-TR') || 0} TL
                        {course.pricePerLesson && ` | Ders başı ${course.pricePerLesson?.toLocaleString('tr-TR')} TL`}
                      </Typography>
                    </Alert>
                  )}

                  {/* Input Fields */}
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Toplam Tutar (₺)"
                        type="number"
                        value={priceCalculator.customTotal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPriceCalculator(prev => ({ ...prev, customTotal: val, inputType: 'total' }));
                        }}
                        placeholder={String(grandTotals.totalAmount || 0)}
                        InputProps={{ sx: { bgcolor: priceCalculator.inputType === 'total' && priceCalculator.customTotal ? 'info.lighter' : 'inherit' } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Aylık Ücret (₺)"
                        type="number"
                        value={priceCalculator.customMonthly}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPriceCalculator(prev => ({ ...prev, customMonthly: val, inputType: 'monthly' }));
                        }}
                        placeholder={String(formData.monthlyFee || 0)}
                        InputProps={{ sx: { bgcolor: priceCalculator.inputType === 'monthly' && priceCalculator.customMonthly ? 'info.lighter' : 'inherit' } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ders Başı (₺)"
                        type="number"
                        value={priceCalculator.customPerLesson}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPriceCalculator(prev => ({ ...prev, customPerLesson: val, inputType: 'perLesson' }));
                        }}
                        placeholder={String(course?.pricePerLesson || 0)}
                        InputProps={{ sx: { bgcolor: priceCalculator.inputType === 'perLesson' && priceCalculator.customPerLesson ? 'info.lighter' : 'inherit' } }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Süre (Ay)"
                        type="number"
                        value={priceCalculator.durationMonths}
                        onChange={(e) => setPriceCalculator(prev => ({ ...prev, durationMonths: parseInt(e.target.value) || 0 }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="+ Ek Ders"
                        type="number"
                        value={priceCalculator.extraLessons}
                        onChange={(e) => setPriceCalculator(prev => ({ ...prev, extraLessons: parseInt(e.target.value) || 0 }))}
                        inputProps={{ min: 0 }}
                        helperText="Ör: 8 ay + 2 ders"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Aylık Ders"
                        type="number"
                        value={priceCalculator.lessonsPerMonth}
                        onChange={(e) => setPriceCalculator(prev => ({ ...prev, lessonsPerMonth: parseInt(e.target.value) || 1 }))}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                  </Grid>

                  {/* Calculated Results */}
                  {(() => {
                    const duration = priceCalculator.durationMonths ?? formData.durationMonths ?? 9;
                    const lessonsPerMonth = priceCalculator.lessonsPerMonth || monthlyLessonDetails?.course?.lessonsPerMonth || 4;
                    const extraLessons = priceCalculator.extraLessons || 0;
                    const totalLessonsFromMonths = duration * lessonsPerMonth;
                    const totalLessons = totalLessonsFromMonths + extraLessons;
                    const defaultTotal = grandTotals.totalAmount || 0;
                    const defaultMonthly = parseFloat(formData.monthlyFee) || course?.pricePerMonth || 0;
                    const defaultPerLesson = course?.pricePerLesson || (lessonsPerMonth > 0 ? defaultMonthly / lessonsPerMonth : 0);

                    let calcTotal, calcMonthly, calcPerLesson, extraLessonsCost;

                    if (priceCalculator.inputType === 'total' && priceCalculator.customTotal) {
                      calcTotal = parseFloat(priceCalculator.customTotal) || 0;
                      calcPerLesson = totalLessons > 0 ? calcTotal / totalLessons : 0;
                      calcMonthly = lessonsPerMonth > 0 ? calcPerLesson * lessonsPerMonth : 0;
                      extraLessonsCost = calcPerLesson * extraLessons;
                    } else if (priceCalculator.inputType === 'monthly' && priceCalculator.customMonthly) {
                      calcMonthly = parseFloat(priceCalculator.customMonthly) || 0;
                      calcPerLesson = lessonsPerMonth > 0 ? calcMonthly / lessonsPerMonth : 0;
                      extraLessonsCost = calcPerLesson * extraLessons;
                      calcTotal = (calcMonthly * duration) + extraLessonsCost;
                    } else if (priceCalculator.inputType === 'perLesson' && priceCalculator.customPerLesson) {
                      calcPerLesson = parseFloat(priceCalculator.customPerLesson) || 0;
                      calcMonthly = calcPerLesson * lessonsPerMonth;
                      extraLessonsCost = calcPerLesson * extraLessons;
                      calcTotal = (calcMonthly * duration) + extraLessonsCost;
                    } else {
                      calcTotal = defaultTotal;
                      calcMonthly = defaultMonthly;
                      calcPerLesson = defaultPerLesson;
                      extraLessonsCost = defaultPerLesson * extraLessons;
                      // Eğer ek ders varsa ve varsayılan hesaplamadaysak, ek dersleri de ekle
                      if (extraLessons > 0) {
                        calcTotal = (defaultMonthly * duration) + extraLessonsCost;
                      }
                    }

                    const discountAmount = defaultTotal - calcTotal;
                    const discountPercent = defaultTotal > 0 ? ((discountAmount / defaultTotal) * 100) : 0;
                    const hasDiscount = discountAmount > 0;
                    const hasIncrease = discountAmount < 0;

                    // Süre gösterimi (8 ay + 2 ders formatında)
                    const durationDisplay = extraLessons > 0
                      ? `${duration} ay + ${extraLessons} ders`
                      : `${duration} ay`;

                    return (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          📊 Hesaplanan Değerler
                          <Chip label={durationDisplay} size="small" variant="outlined" color="primary" />
                          <Chip label={`${totalLessons} ders`} size="small" variant="outlined" />
                        </Typography>

                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Toplam</Typography>
                            <Typography variant="body2" fontWeight="bold">₺{calcTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Aylık</Typography>
                            <Typography variant="body2" fontWeight="bold">₺{calcMonthly.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Ders Başı</Typography>
                            <Typography variant="body2" fontWeight="bold">₺{calcPerLesson.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Typography>
                          </Grid>
                        </Grid>

                        {/* Ek Ders Detayı */}
                        {extraLessons > 0 && extraLessonsCost > 0 && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary">
                              Aylık ({duration} ay): ₺{(calcMonthly * duration).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} +
                              Ek Dersler ({extraLessons} ders): ₺{extraLessonsCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                            </Typography>
                          </Box>
                        )}

                        {(hasDiscount || hasIncrease) && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Chip
                              size="small"
                              color={hasDiscount ? 'success' : 'error'}
                              label={hasDiscount
                                ? `%${discountPercent.toFixed(1)} İndirim (₺${discountAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} tasarruf)`
                                : `%${Math.abs(discountPercent).toFixed(1)} Artış (₺${Math.abs(discountAmount).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} fazla)`
                              }
                              sx={{ width: '100%', justifyContent: 'center' }}
                            />
                          </Box>
                        )}

                        {/* Apply Button */}
                        {(priceCalculator.customTotal || priceCalculator.customMonthly || priceCalculator.customPerLesson || extraLessons > 0) && (
                          <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              fullWidth
                              onClick={() => {
                                // Apply calculated monthly fee to the form
                                setFormData(prev => ({ ...prev, monthlyFee: calcMonthly.toFixed(0) }));
                                // Calculate discount if there is one
                                if (hasDiscount && defaultTotal > 0) {
                                  const fixedDiscount = defaultTotal - calcTotal;
                                  setFormData(prev => ({
                                    ...prev,
                                    monthlyFee: calcMonthly.toFixed(0),
                                    discountType: 'fixed',
                                    discountValue: fixedDiscount.toFixed(0)
                                  }));
                                }
                                // Clear calculator inputs
                                setPriceCalculator(prev => ({
                                  ...prev,
                                  customTotal: '',
                                  customMonthly: '',
                                  customPerLesson: '',
                                  extraLessons: 0
                                }));
                              }}
                            >
                              Ödeme Planına Uygula
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setPriceCalculator(prev => ({
                                ...prev,
                                customTotal: '',
                                customMonthly: '',
                                customPerLesson: '',
                                extraLessons: 0
                              }))}
                            >
                              Temizle
                            </Button>
                          </Box>
                        )}
                      </Box>
                    );
                  })()}
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Ödeme Özeti */}
          <Card sx={{ mb: { xs: 1.5, md: 2 } }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                💰 Ödeme Özeti
                {formData.discountType === 'fullScholarship' && (
                  <Chip label="Tam Burslu" color="secondary" size="small" />
                )}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Kurs Ücreti:</Typography>
                  <Typography variant="body2">₺{grandTotals.totalAmount.toLocaleString('tr-TR')}</Typography>
                </Box>

                {grandTotals.discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">
                      İndirim ({formData.discountType === 'fullScholarship' ? '%100' : formData.discountType === 'percentage' ? `%${formData.discountValue}` : `₺${formData.discountValue}`}):
                    </Typography>
                    <Typography variant="body2" color="success.main">-₺{grandTotals.discountAmount.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Ara Toplam:</Typography>
                  <Typography variant="body2">₺{baseAmount.toLocaleString('tr-TR')}</Typography>
                </Box>

                {grandTotals.commission > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="warning.main">Komisyon:</Typography>
                    <Typography variant="body2" color="warning.main">+₺{grandTotals.commission.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">Öğrenciden Tahsil:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    ₺{grandTotals.total.toLocaleString('tr-TR')}
                  </Typography>
                </Box>

                {grandTotals.vat > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                    <Tooltip title="Faturalı ödemelerde KDV şirket gideri olarak kasadan düşülür">
                      <Typography variant="body2" color="error.main">Şirket Gideri (KDV):</Typography>
                    </Tooltip>
                    <Typography variant="body2" color="error.main">₺{grandTotals.vat.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Taksit Detayları */}
          {calculatedInstallments.length > 0 && (
            <Card sx={{ mb: { xs: 1.5, md: 2 } }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 }, pb: { xs: 1, md: 1 }, '&:last-child': { pb: { xs: 1, md: 1 } } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📋 Taksit Detayları
                  </Typography>
                  <IconButton size="small" onClick={() => setShowInstallmentDetails(!showInstallmentDetails)}>
                    {showInstallmentDetails ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={showInstallmentDetails}>
                  <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                    <Typography variant="caption">
                      Her taksit için ödeme şekli, fatura durumu ve tutarı ayrı ayrı ayarlayabilirsiniz.
                      Tutar değiştirirseniz kalan taksitler otomatik hesaplanır.
                    </Typography>
                  </Alert>

                  {calculatedInstallments.map((inst, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        bgcolor: inst.isCustomAmount ? 'action.selected' : 'background.default',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {index + 1}. Taksit
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {inst.paymentMethod === 'creditCard' && (
                            <Chip icon={<CreditCard sx={{ fontSize: 14 }} />} label="K.Kartı" size="small" color="primary" />
                          )}
                          {inst.paymentMethod === 'cash' && (
                            <Chip icon={<Money sx={{ fontSize: 14 }} />} label="Nakit" size="small" color="success" />
                          )}
                          {inst.isInvoiced && (
                            <Chip icon={<Receipt sx={{ fontSize: 14 }} />} label="Faturalı" size="small" color="warning" />
                          )}
                        </Box>
                      </Box>

                      <Grid container spacing={1} alignItems="center">
                        {/* Vade Tarihi */}
                        <Grid item xs={6}>
                          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                            <DatePicker
                              label="Vade"
                              value={inst.dueDate}
                              onChange={(date) => handleInstallmentDateChange(index, date)}
                              slotProps={{
                                textField: {
                                  size: 'small',
                                  fullWidth: true,
                                  sx: { '& input': { fontSize: '0.85rem' } }
                                }
                              }}
                            />
                          </LocalizationProvider>
                        </Grid>

                        {/* Tutar */}
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Tutar (₺)"
                            type="number"
                            value={inst.amount.toFixed(2)}
                            onChange={(e) => handleInstallmentAmountChange(index, e.target.value)}
                            InputProps={{
                              endAdornment: inst.isCustomAmount && (
                                <Tooltip title="Otomatik hesaplamaya dön">
                                  <IconButton size="small" onClick={() => resetInstallmentAmount(index)}>
                                    <Edit sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              ),
                              sx: { fontSize: '0.85rem' }
                            }}
                          />
                        </Grid>

                        {/* Ödeme Şekli */}
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Ödeme Şekli</InputLabel>
                            <Select
                              value={inst.paymentMethod}
                              onChange={(e) => handleInstallmentPaymentMethodChange(index, e.target.value)}
                              label="Ödeme Şekli"
                              sx={{ fontSize: '0.85rem' }}
                            >
                              <MenuItem value="cash">Nakit</MenuItem>
                              <MenuItem value="creditCard">Kredi Kartı</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Kredi Kartı Taksit */}
                        {inst.paymentMethod === 'creditCard' && (
                          <>
                            <Grid item xs={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel>K.K. Taksit</InputLabel>
                                <Select
                                  value={inst.creditCardInstallments}
                                  onChange={(e) => handleInstallmentCCCountChange(index, e.target.value)}
                                  label="K.K. Taksit"
                                  sx={{ fontSize: '0.85rem' }}
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                                    <MenuItem key={num} value={num}>{num} Taksit</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Komisyon (%)"
                                type="number"
                                value={inst.customCommissionRate !== undefined
                                  ? inst.customCommissionRate
                                  : getCreditCardCommissionRate(inst.creditCardInstallments)}
                                onChange={(e) => handleInstallmentCommissionRateChange(index, e.target.value)}
                                inputProps={{ min: 0, max: 100, step: 0.1 }}
                                sx={{ '& input': { fontSize: '0.85rem' } }}
                                helperText={`Ayarlar: %${getCreditCardCommissionRate(inst.creditCardInstallments)}`}
                              />
                            </Grid>
                          </>
                        )}

                        {/* Faturalı Checkbox */}
                        <Grid item xs={inst.paymentMethod === 'creditCard' ? 6 : 6}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={inst.isInvoiced}
                                onChange={(e) => handleInstallmentInvoicedChange(index, e.target.checked)}
                                size="small"
                              />
                            }
                            label={<Typography variant="body2">Faturalı</Typography>}
                          />
                        </Grid>

                        {/* KDV Rate Input - only show when invoiced */}
                        {inst.isInvoiced && (
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="KDV (%)"
                              type="number"
                              value={inst.customVatRate !== undefined ? inst.customVatRate : (settings?.vatRate || 10)}
                              onChange={(e) => handleInstallmentVatRateChange(index, e.target.value)}
                              inputProps={{ min: 0, max: 100, step: 0.1 }}
                              sx={{ '& input': { fontSize: '0.85rem' } }}
                              helperText={`Varsayılan: %${settings?.vatRate || 10}`}
                            />
                          </Grid>
                        )}
                      </Grid>

                      {/* Komisyon Detayı */}
                      {inst.commission > 0 && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                          <Typography variant="caption" color="warning.main">
                            Komisyon (%{inst.commissionRate}): +₺{inst.commission.toLocaleString('tr-TR')}
                          </Typography>
                        </Box>
                      )}

                      {/* Toplam */}
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight="bold">Öğrenci Ödemesi:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          ₺{inst.total.toLocaleString('tr-TR')}
                        </Typography>
                      </Box>

                      {/* KDV Gideri (Faturalı ise) */}
                      {inst.vat > 0 && (
                        <Box sx={{ mt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                          <Tooltip title="Öğrenciye yansıtılmaz, kasadan düşülür">
                            <Typography variant="caption" color="error.main">
                              Şirket Gideri (KDV %{inst.vatRate}):
                            </Typography>
                          </Tooltip>
                          <Typography variant="caption" color="error.main">
                            ₺{inst.vat.toLocaleString('tr-TR')}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Collapse>
              </CardContent>
            </Card>
          )}

          {/* Ders Detayları */}
          {monthlyLessonDetails && formData.courseType === 'monthly' && (
            <Card>
              <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📚 Ders Detayları
                    {monthlyLessonDetails.isBirebir && (
                      <Chip label="Birebir" size="small" color="secondary" sx={{ height: 20, fontSize: 10 }} />
                    )}
                  </Typography>
                  <IconButton size="small" onClick={() => setShowLessonDetails(!showLessonDetails)}>
                    {showLessonDetails ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={showLessonDetails}>
                  {!monthlyLessonDetails.hasSchedule && (
                    <Alert severity="warning" sx={{ mb: 2, py: 0 }}>
                      <Typography variant="caption">Aylık program oluşturulmamış</Typography>
                    </Alert>
                  )}

                  {monthlyLessonDetails.isBirebir && (
                    <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                      <Typography variant="caption">
                        Birebir ders - Ders başı fiyatlandırma uygulanıyor
                        ({monthlyLessonDetails.birebirLessonsInfo?.totalLessons} ders × ₺{(monthlyLessonDetails.course?.pricePerLesson || 0).toLocaleString('tr-TR')})
                      </Typography>
                    </Alert>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {monthlyLessonDetails.isBirebir ? (
                        <>Ders Başı: ₺{(monthlyLessonDetails.course?.pricePerLesson || 0).toLocaleString('tr-TR')}</>
                      ) : (
                        <>
                          Aylık: ₺{currentMonthlyFee.toLocaleString('tr-TR')} |
                          Ders Başı: ₺{calculatedPricePerLesson.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </>
                      )}
                    </Typography>
                  </Box>

                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.5, fontWeight: 'bold' }}>Ay</TableCell>
                        <TableCell align="center" sx={{ py: 0.5, fontWeight: 'bold' }}>Ders</TableCell>
                        <TableCell align="right" sx={{ py: 0.5, fontWeight: 'bold' }}>Ücret</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlyLessonDetails.monthlyDetails.map((month, index) => {
                        const isPartialFirst = index === 0 && monthlyLessonDetails.firstMonthPartial && formData.partialPricingChoice === 'partial';
                        const lessonCount = isPartialFirst ? month.lessonsAfterEnrollment : month.lessonCount;

                        // For birebir courses, always use per-lesson pricing
                        // For group courses, use monthly fee (unless partial first month)
                        let monthFee;
                        if (monthlyLessonDetails.isBirebir) {
                          // Birebir: always per-lesson pricing
                          monthFee = lessonCount * (monthlyLessonDetails.course?.pricePerLesson || 0);
                        } else if (isPartialFirst) {
                          // Group course with partial first month
                          monthFee = lessonCount * calculatedPricePerLesson;
                        } else {
                          // Group course with full monthly fee
                          monthFee = currentMonthlyFee;
                        }

                        return (
                          <TableRow key={month.monthIndex}>
                            <TableCell sx={{ py: 0.5 }}>
                              {month.month}
                              {isPartialFirst && <Chip label="Kısmi" size="small" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />}
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.5 }}>
                              {lessonCount > 0 ? `${lessonCount} ders` : '-'}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontWeight: 500 }}>
                              ₺{monthFee.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Toplam: {monthlyLessonDetails.monthlyDetails.reduce((sum, month, index) => {
                        if (index === 0 && monthlyLessonDetails.firstMonthPartial && formData.partialPricingChoice === 'partial') {
                          return sum + month.lessonsAfterEnrollment;
                        }
                        return sum + month.lessonCount;
                      }, 0)} ders
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                      ₺{(parseFloat(formData.totalAmount) || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Partial Pricing Dialog */}
      <Dialog open={showPartialPricingDialog} onClose={() => setShowPartialPricingDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>İlk Ay Ücretlendirme</DialogTitle>
        <DialogContent>
          {monthlyLessonDetails && monthlyLessonDetails.firstMonthPartial && (() => {
            const monthlyFee = monthlyLessonDetails.course?.monthlyFee || 0;
            const pricePerLesson = monthlyLessonDetails.course?.pricePerLesson || 0;
            const durationMonths = parseInt(formData.durationMonths) || 0;
            const lessonsAfterEnrollment = monthlyLessonDetails.firstMonthPartial.lessonsAfterEnrollment;
            const lessonsBeforeEnrollment = monthlyLessonDetails.firstMonthPartial.lessonsBeforeEnrollment;
            const partialFirstMonthFee = monthlyLessonDetails.pricing.partialFirstMonthFee || 0;
            const remainingMonths = durationMonths - 1;
            const remainingMonthsFee = remainingMonths * monthlyFee;
            const savings = monthlyLessonDetails.pricing.totalByMonthly - monthlyLessonDetails.pricing.totalByPartialFirst;

            return (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {monthlyLessonDetails.monthlyDetails[0]?.month} ayında kayıt öncesi <strong>{lessonsBeforeEnrollment}</strong> ders yapılmış.
                  <br />
                  <Typography variant="caption">
                    Kayıt sonrası katılabilecek ders sayısı: <strong>{lessonsAfterEnrollment}</strong>
                  </Typography>
                </Alert>

                <RadioGroup
                  value={formData.partialPricingChoice}
                  onChange={(e) => {
                    const choice = e.target.value;
                    const newTotal = choice === 'full'
                      ? monthlyLessonDetails.pricing.totalByMonthly
                      : monthlyLessonDetails.pricing.totalByPartialFirst;
                    setFormData(prev => ({ ...prev, partialPricingChoice: choice, totalAmount: newTotal }));
                  }}
                >
                  <FormControlLabel
                    value="full"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography fontWeight="bold">Tam Aylık Ücret</Typography>
                        <Typography variant="body2" color="text.secondary">
                          ₺{monthlyFee.toLocaleString('tr-TR')} x {durationMonths} ay = <strong>₺{monthlyLessonDetails.pricing.totalByMonthly.toLocaleString('tr-TR')}</strong>
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="partial"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography fontWeight="bold">
                          Kısmi Ücret ({lessonsAfterEnrollment} ders)
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          İlk ay: {lessonsAfterEnrollment} ders x ₺{pricePerLesson.toLocaleString('tr-TR')} = ₺{partialFirstMonthFee.toLocaleString('tr-TR')}
                        </Typography>
                        {remainingMonths > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Kalan: ₺{monthlyFee.toLocaleString('tr-TR')} x {remainingMonths} ay = ₺{remainingMonthsFee.toLocaleString('tr-TR')}
                          </Typography>
                        )}
                        <Typography variant="body2" color="primary" fontWeight="bold">
                          Toplam: ₺{monthlyLessonDetails.pricing.totalByPartialFirst.toLocaleString('tr-TR')}
                          <Chip
                            label={`₺${savings.toLocaleString('tr-TR')} tasarruf`}
                            size="small"
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPartialPricingDialog(false)} variant="contained">Onayla</Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog - Ask to send notification */}
      <Dialog
        open={successDialog.open}
        onClose={() => {
          const planId = successDialog.paymentPlanId;
          setSuccessDialog({ open: false, planData: null, paymentPlanId: null });
          if (planId) {
            navigate(`/payment-plan-detail/${planId}`);
          } else {
            navigate(`/students/${studentId}`);
          }
        }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
          ✓ Ödeme Planı Oluşturuldu
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{successDialog.planData?.studentName}</strong> için{' '}
                <strong>{successDialog.planData?.courseName}</strong> dersi ödeme planı başarıyla oluşturuldu.
              </Typography>
            </Alert>

            <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
              Detayları mesaj olarak göndermek ister misiniz?
            </Typography>

            <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    ₺{successDialog.planData?.totalAmount?.toLocaleString('tr-TR')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Taksit Sayısı</Typography>
                  <Typography variant="body1">{successDialog.planData?.installmentCount} taksit</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppNotification}
                sx={{
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#128C7E' },
                  flex: 1
                }}
              >
                WhatsApp
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<Email />}
                onClick={handleEmailNotification}
                color="info"
                sx={{ flex: 1 }}
              >
                Email
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              const planId = successDialog.paymentPlanId;
              setSuccessDialog({ open: false, planData: null, paymentPlanId: null });
              if (planId) {
                navigate(`/payment-plan-detail/${planId}`);
              } else {
                navigate(`/students/${studentId}`);
              }
            }}
            color="inherit"
          >
            Hayır, Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={() => {
          const planId = successDialog.paymentPlanId;
          setEmailDialogOpen(false);
          setSuccessDialog({ open: false, planData: null, paymentPlanId: null });
          if (planId) {
            navigate(`/payment-plan-detail/${planId}`);
          } else {
            navigate(`/students/${studentId}`);
          }
        }}
        recipients={(() => {
          const { email, recipientName } = getNotificationRecipient();
          return email ? [{ email, name: recipientName }] : [];
        })()}
        defaultSubject={`Ödeme Planı Detayları - ${successDialog.planData?.studentName || ''}`}
        defaultMessage=""
        templateData={getEmailTemplateData()}
        onSuccess={() => {
          const planId = successDialog.paymentPlanId;
          alert('Email başarıyla gönderildi!');
          setEmailDialogOpen(false);
          setSuccessDialog({ open: false, planData: null, paymentPlanId: null });
          if (planId) {
            navigate(`/payment-plan-detail/${planId}`);
          } else {
            navigate(`/students/${studentId}`);
          }
        }}
      />
    </Container>
  );
};

export default PaymentPlan;
