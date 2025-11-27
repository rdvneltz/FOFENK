import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import { ArrowBack, ExpandMore, ExpandLess } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
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
    paymentType: 'cashFull',
    installmentCount: 1,
    firstInstallmentDate: new Date(),
    paymentDate: new Date().toISOString().split('T')[0],
    installmentFrequency: 'monthly',
    customFrequencyDays: 30,
    useCustomAmounts: false,
    customInstallments: [],
    isInvoiced: false,
    description: '',
    partialPricingChoice: 'full',
    // Mixed payment fields
    cashAmount: '',
    creditCardAmount: '',
    creditCardInstallmentCount: 1,
  });
  const [settings, setSettings] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [selectedCashRegister, setSelectedCashRegister] = useState('');
  const [monthlyLessonDetails, setMonthlyLessonDetails] = useState(null);
  const [showLessonDetails, setShowLessonDetails] = useState(true);
  const [showPartialPricingDialog, setShowPartialPricingDialog] = useState(false);

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

  const getCreditCardCommissionRate = (installmentCount) => {
    if (!settings || !settings.creditCardRates) return 0;
    const rateObj = settings.creditCardRates.find(r => r.installments === installmentCount);
    return rateObj ? rateObj.rate : 0;
  };

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

  // Calculations
  const calculations = useMemo(() => {
    const totalAmount = parseFloat(formData.totalAmount) || 0;

    let discountAmount = 0;
    if (formData.discountType === 'fullScholarship') {
      discountAmount = totalAmount;
    } else if (formData.discountType === 'percentage') {
      discountAmount = (totalAmount * parseFloat(formData.discountValue)) / 100;
    } else if (formData.discountType === 'fixed') {
      discountAmount = parseFloat(formData.discountValue) || 0;
    }

    const subtotal = totalAmount - discountAmount;
    const vatRate = getVatRate();

    // For mixed payments
    if (formData.paymentType === 'mixed') {
      const cashAmount = parseFloat(formData.cashAmount) || 0;
      const creditCardAmount = parseFloat(formData.creditCardAmount) || 0;
      const commissionRate = getCreditCardCommissionRate(parseInt(formData.creditCardInstallmentCount));
      const commissionAmount = (creditCardAmount * commissionRate) / 100;
      const totalWithCommission = cashAmount + creditCardAmount + commissionAmount;
      const vatAmount = formData.isInvoiced ? (totalWithCommission * vatRate) / 100 : 0;

      return {
        totalAmount,
        discountAmount,
        subtotal,
        cashAmount,
        creditCardAmount,
        commissionRate,
        commissionAmount,
        chargeAmount: totalWithCommission,
        vatRate,
        vatAmount,
        finalAmount: totalWithCommission,
        installmentAmount: 0,
        isMixed: true
      };
    }

    // For credit card
    let commissionRate = 0;
    let commissionAmount = 0;
    if (formData.paymentType === 'creditCard' && formData.installmentCount) {
      commissionRate = getCreditCardCommissionRate(parseInt(formData.installmentCount));
      commissionAmount = (subtotal * commissionRate) / 100;
    }

    const chargeAmount = subtotal + commissionAmount;
    const vatAmount = formData.isInvoiced ? (chargeAmount * vatRate) / 100 : 0;
    const finalAmount = chargeAmount;
    const installmentAmount = formData.installmentCount
      ? (finalAmount / parseInt(formData.installmentCount)).toFixed(2)
      : 0;

    return {
      totalAmount,
      discountAmount,
      subtotal,
      commissionRate,
      commissionAmount,
      chargeAmount,
      vatRate,
      vatAmount,
      finalAmount,
      installmentAmount,
      isMixed: false
    };
  }, [formData, settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const needsCashRegister = formData.paymentType === 'creditCard' || formData.paymentType === 'mixed';
      if (!selectedCashRegister && needsCashRegister) {
        setError('Lütfen bir kasa seçin');
        setLoading(false);
        return;
      }

      const selectedEnrollment = enrollments.find(e => e._id === formData.enrollmentId);
      if (!selectedEnrollment) {
        setError('Lütfen bir ders seçin');
        setLoading(false);
        return;
      }

      const installments = [];
      const chargeAmount = calculations.chargeAmount;
      const installmentCount = parseInt(formData.installmentCount);

      if (formData.paymentType === 'creditCard') {
        installments.push({
          installmentNumber: 1,
          amount: chargeAmount,
          dueDate: new Date(formData.paymentDate),
          isPaid: false,
          paidAmount: 0,
          isInvoiced: formData.isInvoiced
        });
      } else if (formData.paymentType === 'mixed') {
        // Mixed: Create separate installments for cash and credit card
        const cashAmount = parseFloat(formData.cashAmount) || 0;
        const creditCardAmount = parseFloat(formData.creditCardAmount) || 0;
        const commissionAmount = calculations.commissionAmount;

        if (cashAmount > 0) {
          installments.push({
            installmentNumber: 1,
            amount: cashAmount,
            dueDate: new Date(formData.firstInstallmentDate),
            isPaid: false,
            paidAmount: 0,
            isInvoiced: formData.isInvoiced,
            paymentMethod: 'cash'
          });
        }

        if (creditCardAmount > 0) {
          installments.push({
            installmentNumber: cashAmount > 0 ? 2 : 1,
            amount: creditCardAmount + commissionAmount,
            dueDate: new Date(formData.paymentDate),
            isPaid: false,
            paidAmount: 0,
            isInvoiced: formData.isInvoiced,
            paymentMethod: 'creditCard'
          });
        }
      } else {
        // Cash payments
        const startDate = new Date(formData.firstInstallmentDate);
        const installmentAmount = chargeAmount / installmentCount;

        for (let i = 0; i < installmentCount; i++) {
          const dueDate = new Date(startDate);
          if (formData.installmentFrequency === 'weekly') {
            dueDate.setDate(startDate.getDate() + (i * 7));
          } else if (formData.installmentFrequency === 'custom') {
            dueDate.setDate(startDate.getDate() + (i * parseInt(formData.customFrequencyDays)));
          } else {
            dueDate.setMonth(startDate.getMonth() + i);
          }

          installments.push({
            installmentNumber: i + 1,
            amount: installmentAmount,
            dueDate,
            isPaid: false,
            paidAmount: 0,
            isInvoiced: formData.isInvoiced
          });
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const shouldProcessImmediately = (formData.paymentType === 'creditCard' || formData.paymentType === 'mixed') && formData.paymentDate === today;

      const paymentPlanData = {
        student: studentId,
        enrollment: formData.enrollmentId,
        course: selectedEnrollment.course._id,
        paymentType: formData.paymentType,
        totalAmount: calculations.totalAmount,
        discountedAmount: chargeAmount,
        discountType: formData.discountType,
        discountValue: formData.discountType === 'fullScholarship' ? 100 : parseFloat(formData.discountValue) || 0,
        installments,
        creditCardInstallments: formData.paymentType === 'creditCard'
          ? installmentCount
          : formData.paymentType === 'mixed'
            ? parseInt(formData.creditCardInstallmentCount)
            : undefined,
        creditCardCommission: (formData.paymentType === 'creditCard' || formData.paymentType === 'mixed')
          ? { rate: calculations.commissionRate, amount: calculations.commissionAmount }
          : undefined,
        vat: formData.isInvoiced ? { rate: calculations.vatRate, amount: calculations.vatAmount } : undefined,
        isInvoiced: formData.isInvoiced,
        institution: institution._id,
        season: season._id,
        notes: formData.description,
        createdBy: user?.username || 'System',
        autoCreatePayment: shouldProcessImmediately,
        paymentDate: (formData.paymentType === 'creditCard' || formData.paymentType === 'mixed') ? formData.paymentDate : undefined,
        cashRegister: needsCashRegister ? selectedCashRegister : undefined
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
  const pricePerLesson = monthlyLessonDetails?.course?.pricePerLesson || course?.pricePerLesson || 0;

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
                    <InputLabel>Ödeme Tipi</InputLabel>
                    <Select name="paymentType" value={formData.paymentType} onChange={handleChange} label="Ödeme Tipi">
                      <MenuItem value="cashFull">Nakit Peşin</MenuItem>
                      <MenuItem value="cashInstallment">Nakit Taksitli</MenuItem>
                      <MenuItem value="creditCard">Kredi Kartı</MenuItem>
                      <MenuItem value="mixed">Karma (Nakit + K.Kartı)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isInvoiced}
                        onChange={(e) => setFormData({ ...formData, isInvoiced: e.target.checked })}
                        size="small"
                      />
                    }
                    label={`Faturalı (+%${calculations.vatRate} KDV)`}
                  />
                </Grid>

                {/* Karma Ödeme Alanları */}
                {formData.paymentType === 'mixed' && (
                  <>
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        Toplam: ₺{calculations.subtotal.toLocaleString('tr-TR')} - Nakit ve kredi kartı tutarlarını girin
                      </Alert>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth size="small"
                        label="Nakit Tutar (₺)"
                        name="cashAmount"
                        type="number"
                        value={formData.cashAmount}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField
                        fullWidth size="small"
                        label="Kredi Kartı (₺)"
                        name="creditCardAmount"
                        type="number"
                        value={formData.creditCardAmount}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>K.K. Taksit</InputLabel>
                        <Select
                          name="creditCardInstallmentCount"
                          value={formData.creditCardInstallmentCount}
                          onChange={handleChange}
                          label="K.K. Taksit"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                            <MenuItem key={num} value={num}>{num} Taksit</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Kasa</InputLabel>
                        <Select value={selectedCashRegister} onChange={(e) => setSelectedCashRegister(e.target.value)} label="Kasa">
                          {cashRegisters.map((r) => (
                            <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                          label="Nakit Ödeme Tarihi"
                          value={formData.firstInstallmentDate}
                          onChange={(date) => setFormData({ ...formData, firstInstallmentDate: date })}
                          slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small"
                        label="K.Kartı Ödeme Tarihi"
                        name="paymentDate"
                        type="date"
                        value={formData.paymentDate}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}

                {/* Kredi Kartı Alanları */}
                {formData.paymentType === 'creditCard' && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Kasa</InputLabel>
                        <Select value={selectedCashRegister} onChange={(e) => setSelectedCashRegister(e.target.value)} label="Kasa">
                          {cashRegisters.map((r) => (
                            <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Taksit Sayısı</InputLabel>
                        <Select name="installmentCount" value={formData.installmentCount} onChange={handleChange} label="Taksit Sayısı">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                            <MenuItem key={num} value={num}>{num} Taksit</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField
                        fullWidth size="small"
                        label="Ödeme Tarihi"
                        name="paymentDate"
                        type="date"
                        value={formData.paymentDate}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}

                {/* Nakit Taksitli Alanları */}
                {formData.paymentType === 'cashInstallment' && (
                  <>
                    <Grid item xs={6} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Taksit Sayısı</InputLabel>
                        <Select
                          name="installmentCount"
                          value={formData.installmentCount}
                          onChange={(e) => {
                            const count = parseInt(e.target.value);
                            setFormData({ ...formData, installmentCount: count });
                          }}
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
                          label="İlk Taksit"
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
                  <Typography variant="body2">₺{calculations.totalAmount.toLocaleString('tr-TR')}</Typography>
                </Box>

                {calculations.discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="success.main">
                      İndirim ({formData.discountType === 'fullScholarship' ? '%100' : formData.discountType === 'percentage' ? `%${formData.discountValue}` : `₺${formData.discountValue}`}):
                    </Typography>
                    <Typography variant="body2" color="success.main">-₺{calculations.discountAmount.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}

                {formData.paymentType === 'mixed' && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Nakit:</Typography>
                      <Typography variant="body2">₺{(parseFloat(formData.cashAmount) || 0).toLocaleString('tr-TR')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Kredi Kartı:</Typography>
                      <Typography variant="body2">₺{(parseFloat(formData.creditCardAmount) || 0).toLocaleString('tr-TR')}</Typography>
                    </Box>
                    {calculations.commissionAmount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="warning.main">
                          Komisyon (%{calculations.commissionRate}):
                        </Typography>
                        <Typography variant="body2" color="warning.main">+₺{calculations.commissionAmount.toLocaleString('tr-TR')}</Typography>
                      </Box>
                    )}
                  </>
                )}

                {formData.paymentType === 'creditCard' && calculations.commissionAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="warning.main">
                      Komisyon ({formData.installmentCount} taksit - %{calculations.commissionRate}):
                    </Typography>
                    <Typography variant="body2" color="warning.main">+₺{calculations.commissionAmount.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">Ödenecek:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    ₺{calculations.chargeAmount.toLocaleString('tr-TR')}
                  </Typography>
                </Box>

                {formData.isInvoiced && calculations.vatAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="error.main">KDV (%{calculations.vatRate}):</Typography>
                    <Typography variant="body2" color="error.main">₺{calculations.vatAmount.toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}

                {formData.paymentType === 'cashInstallment' && formData.installmentCount > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {formData.installmentCount} × Taksit:
                    </Typography>
                    <Typography variant="body2">₺{parseFloat(calculations.installmentAmount).toLocaleString('tr-TR')}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

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
                      Aylık: ₺{monthlyLessonDetails.course.monthlyFee.toLocaleString('tr-TR')} |
                      Ders Başı: ₺{pricePerLesson.toLocaleString('tr-TR')}
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
                          ? lessonCount * pricePerLesson
                          : monthlyLessonDetails.course.monthlyFee;

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
                              ₺{monthFee.toLocaleString('tr-TR')}
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
                      ₺{calculations.chargeAmount.toLocaleString('tr-TR')}
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
