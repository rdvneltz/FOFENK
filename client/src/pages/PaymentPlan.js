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
} from '@mui/material';
import { ArrowBack, ExpandMore, ExpandLess, Edit, CreditCard, Money, Receipt } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { format, addMonths, addDays, addWeeks } from 'date-fns';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const PaymentPlan = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { institution, season, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [formData, setFormData] = useState({
    enrollmentId: '',
    courseType: '',
    enrollmentDate: new Date().toISOString().split('T')[0],
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
  const [settings, setSettings] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [selectedCashRegister, setSelectedCashRegister] = useState('');
  const [monthlyLessonDetails, setMonthlyLessonDetails] = useState(null);
  const [showLessonDetails, setShowLessonDetails] = useState(true);
  const [showPartialPricingDialog, setShowPartialPricingDialog] = useState(false);
  const [showInstallmentDetails, setShowInstallmentDetails] = useState(true);

  // Installment details state - each installment can have custom settings
  const [installmentDetails, setInstallmentDetails] = useState([]);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentRes, enrollmentsRes, cashRes, settingsRes] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get('/enrollments', { params: { studentId, seasonId: season._id } }),
        api.get('/cash-registers', { params: { institution: institution._id } }),
        api.get('/settings', { params: { institutionId: institution._id } }),
      ]);

      setStudent(studentRes.data);
      setEnrollments(enrollmentsRes.data);
      setCashRegisters(cashRes.data);

      if (cashRes.data.length > 0) {
        setSelectedCashRegister(cashRes.data[0]._id);
      }

      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings(settingsRes.data[0]);
      }

      if (enrollmentsRes.data.length > 0) {
        await handleEnrollmentChange(enrollmentsRes.data[0]._id, enrollmentsRes.data);
      }
    } catch (error) {
      setError('Veri yüklenirken bir hata oluştu');
      console.error(error);
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

  const calculateMonthlyLessonDetails = async (enrollmentId, durationMonths, enrollmentsList = null) => {
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

      const response = await api.post('/courses/calculate-monthly-lessons', {
        courseId: enrollment.course._id,
        startDate: enrollment.enrollmentDate || new Date(),
        durationMonths: parseInt(durationMonths),
        enrollmentDate: formData.enrollmentDate
      });

      setMonthlyLessonDetails(response.data);

      if (response.data.firstMonthPartial && response.data.pricing.hasPartialOption) {
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

    setFormData((prev) => ({
      ...prev,
      enrollmentId,
      courseType: isMonthly ? 'monthly' : 'perLesson',
      enrollmentDate: selectedEnrollment.enrollmentDate
        ? new Date(selectedEnrollment.enrollmentDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      monthlyFee: isMonthly ? priceValue : '',
      totalAmount: calculatedTotal,
      durationMonths: suggestedMonths
    }));

    if (isMonthly && suggestedMonths > 0) {
      await calculateMonthlyLessonDetails(enrollmentId, suggestedMonths, enrollmentsToUse);
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
    updated[index] = { ...updated[index], isInvoiced };
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

  // Calculate totals including commission and VAT per installment
  const calculatedInstallments = useMemo(() => {
    return installmentDetails.map(inst => {
      let commission = 0;
      let commissionRate = 0;
      if (inst.paymentMethod === 'creditCard') {
        commissionRate = getCreditCardCommissionRate(inst.creditCardInstallments);
        commission = (inst.amount * commissionRate) / 100;
      }

      const subtotal = inst.amount + commission;
      const vatRate = getVatRate();
      const vat = inst.isInvoiced ? (subtotal * vatRate) / 100 : 0;
      const total = subtotal + vat;

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
        cashRegister: hasCreditCard ? selectedCashRegister : undefined
      };

      await api.post('/payment-plans', paymentPlanData);
      navigate(`/students/${studentId}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/students/${studentId}`)}>
          Geri
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Sol Panel - Form */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Ödeme Planı Oluştur
            </Typography>

            {student && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
                <Typography variant="h6">{student.firstName} {student.lastName}</Typography>
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
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth size="small"
                        label="Kayıt Tarihi"
                        name="enrollmentDate"
                        type="date"
                        value={formData.enrollmentDate}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, enrollmentDate: e.target.value }));
                          if (formData.enrollmentId && formData.durationMonths > 0) {
                            calculateMonthlyLessonDetails(formData.enrollmentId, formData.durationMonths);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
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
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth size="small"
                        label="Süre (Ay)"
                        name="durationMonths"
                        type="number"
                        value={formData.durationMonths}
                        onChange={handleChange}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth size="small"
                        label="Toplam (₺)"
                        value={formData.totalAmount || 0}
                        InputProps={{ readOnly: true }}
                        sx={{ '& .MuiInputBase-input': { fontWeight: 600, color: 'primary.main' } }}
                      />
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
                  </>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                {/* İndirim */}
                <Grid item xs={6} sm={4}>
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
                  <Grid item xs={6} sm={4}>
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
                <Grid item xs={6} sm={4}>
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
                    <Grid item xs={6} sm={4}>
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
                    <Grid item xs={6} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Ödeme Sıklığı</InputLabel>
                        <Select name="installmentFrequency" value={formData.installmentFrequency} onChange={handleChange} label="Ödeme Sıklığı">
                          <MenuItem value="monthly">Aylık</MenuItem>
                          <MenuItem value="weekly">Haftalık</MenuItem>
                          <MenuItem value="custom">Özel</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
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
                  <Grid item xs={12} sm={6}>
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
                  <Grid item xs={12} sm={6}>
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
          {/* Ödeme Özeti */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

                {grandTotals.vat > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="error.main">KDV:</Typography>
                    <Typography variant="body2" color="error.main">+₺{grandTotals.vat.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">Toplam Ödenecek:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    ₺{grandTotals.total.toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Taksit Detayları */}
          {calculatedInstallments.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                        )}

                        {/* Faturalı Checkbox */}
                        <Grid item xs={inst.paymentMethod === 'creditCard' ? 12 : 6}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={inst.isInvoiced}
                                onChange={(e) => handleInstallmentInvoicedChange(index, e.target.checked)}
                                size="small"
                              />
                            }
                            label={<Typography variant="body2">Faturalı (+%{getVatRate()} KDV)</Typography>}
                          />
                        </Grid>
                      </Grid>

                      {/* Komisyon ve KDV Detayları */}
                      {(inst.commission > 0 || inst.vat > 0) && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                          <Grid container spacing={1}>
                            {inst.commission > 0 && (
                              <Grid item xs={6}>
                                <Typography variant="caption" color="warning.main">
                                  Komisyon (%{inst.commissionRate}): +₺{inst.commission.toLocaleString('tr-TR')}
                                </Typography>
                              </Grid>
                            )}
                            {inst.vat > 0 && (
                              <Grid item xs={6}>
                                <Typography variant="caption" color="error.main">
                                  KDV (%{inst.vatRate}): +₺{inst.vat.toLocaleString('tr-TR')}
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}

                      {/* Toplam */}
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight="bold">Toplam:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          ₺{inst.total.toLocaleString('tr-TR')}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Collapse>
              </CardContent>
            </Card>
          )}

          {/* Ders Detayları */}
          {monthlyLessonDetails && formData.courseType === 'monthly' && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📚 Ders Detayları
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

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aylık: ₺{currentMonthlyFee.toLocaleString('tr-TR')} |
                      Ders Başı: ₺{calculatedPricePerLesson.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
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
                        const monthFee = isPartialFirst
                          ? lessonCount * calculatedPricePerLesson
                          : currentMonthlyFee;

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
                              ₺{monthFee.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
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
      <Dialog open={showPartialPricingDialog} onClose={() => setShowPartialPricingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>İlk Ay Ücretlendirme</DialogTitle>
        <DialogContent>
          {monthlyLessonDetails && monthlyLessonDetails.firstMonthPartial && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                {monthlyLessonDetails.monthlyDetails[0]?.month} ayında kayıt öncesi {monthlyLessonDetails.firstMonthPartial.lessonsBeforeEnrollment} ders yapılmış.
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
                  label={`Tam Aylık Ücret - ₺${monthlyLessonDetails.pricing.totalByMonthly.toLocaleString('tr-TR')}`}
                />
                <FormControlLabel
                  value="partial"
                  control={<Radio />}
                  label={`Kısmi Ücret (${monthlyLessonDetails.firstMonthPartial.lessonsAfterEnrollment} ders) - ₺${monthlyLessonDetails.pricing.totalByPartialFirst.toLocaleString('tr-TR')} (₺${(monthlyLessonDetails.pricing.totalByMonthly - monthlyLessonDetails.pricing.totalByPartialFirst).toLocaleString('tr-TR')} tasarruf)`}
                />
              </RadioGroup>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPartialPricingDialog(false)} variant="contained">Onayla</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PaymentPlan;
