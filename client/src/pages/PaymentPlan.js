import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
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
    courseType: '', // 'monthly' or 'perLesson' - to avoid state synchronization issues
    totalAmount: '',
    monthlyFee: '', // Store monthly fee for auto-calculation
    durationMonths: '', // How many months registration
    discountType: 'none',
    discountValue: 0,
    paymentType: 'cashFull',
    installmentCount: 1,
    firstInstallmentDate: new Date(),
    paymentDate: new Date().toISOString().split('T')[0], // For credit card payment date
    installmentFrequency: 'monthly',
    customFrequencyDays: 30,
    useCustomAmounts: false,
    customInstallments: [],
    isInvoiced: false,
    description: '',
  });
  const [settings, setSettings] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [selectedCashRegister, setSelectedCashRegister] = useState('');
  const [monthlyLessonDetails, setMonthlyLessonDetails] = useState(null);
  const [showLessonDetails, setShowLessonDetails] = useState(false);
  const [rateDialog, setRateDialog] = useState({
    open: false,
    type: '', // 'commission' or 'vat'
    value: '',
    installmentCount: null
  });

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentRes, enrollmentsRes, cashRes, settingsRes] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get('/enrollments', {
          params: { studentId, seasonId: season._id },
        }),
        api.get('/cash-registers', {
          params: { institution: institution._id },
        }),
        api.get('/settings', {
          params: { institutionId: institution._id },
        }),
      ]);

      setStudent(studentRes.data);
      setEnrollments(enrollmentsRes.data);
      setCashRegisters(cashRes.data);

      // Set first cash register as default
      if (cashRes.data.length > 0) {
        setSelectedCashRegister(cashRes.data[0]._id);
      }

      // Load settings
      if (settingsRes.data && settingsRes.data.length > 0) {
        setSettings(settingsRes.data[0]);
      }

      // Set first enrollment as default and populate form data
      if (enrollmentsRes.data.length > 0) {
        const firstEnrollmentId = enrollmentsRes.data[0]._id;
        // Don't set enrollmentId separately - handleEnrollmentChange will set everything
        // This prevents race condition between two setFormData calls

        // Manually populate form with enrollment data (don't rely on useEffect)
        // IMPORTANT: await to ensure API call completes for monthly courses
        await handleEnrollmentChange(firstEnrollmentId, enrollmentsRes.data);
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

  const getVatRate = () => {
    // Return settings VAT rate (settings should always exist from DB)
    return settings?.vatRate || 10;
  };

  const calculateMonthlyLessonDetails = async (enrollmentId, durationMonths, enrollmentsList = null) => {
    if (!enrollmentId || !durationMonths || durationMonths <= 0) {
      setMonthlyLessonDetails(null);
      setShowLessonDetails(false);
      return;
    }

    try {
      // Use provided enrollmentsList or fall back to state
      const enrollmentsToUse = enrollmentsList || enrollments;
      const enrollment = enrollmentsToUse.find(e => e._id === enrollmentId);

      if (!enrollment || !enrollment.course) {
        setMonthlyLessonDetails(null);
        setShowLessonDetails(false);
        return;
      }

      // Only calculate for monthly pricing courses
      if (enrollment.course.pricingType !== 'monthly') {
        setMonthlyLessonDetails(null);
        setShowLessonDetails(false);
        return;
      }

      const response = await api.post('/courses/calculate-monthly-lessons', {
        courseId: enrollment.course._id,
        startDate: enrollment.enrollmentDate || new Date(),
        durationMonths: parseInt(durationMonths)
      });

      setMonthlyLessonDetails(response.data);
      setShowLessonDetails(true);
    } catch (error) {
      console.error('Error calculating monthly lessons:', error);
      setMonthlyLessonDetails(null);
      setShowLessonDetails(false);
    }
  };

  const handleEnrollmentChange = async (enrollmentId, enrollmentsList = null) => {
    // Use provided enrollmentsList or fall back to state
    const enrollmentsToUse = enrollmentsList || enrollments;
    const selectedEnrollment = enrollmentsToUse.find(e => e._id === enrollmentId);

    console.log('🔍 DEBUG - handleEnrollmentChange called');
    console.log('📋 Selected Enrollment:', selectedEnrollment);
    console.log('📚 Course:', selectedEnrollment?.course);
    console.log('💰 Price Per Month:', selectedEnrollment?.course?.pricePerMonth);
    console.log('📊 Pricing Type:', selectedEnrollment?.course?.pricingType);

    if (!selectedEnrollment || !selectedEnrollment.course) {
      console.log('❌ No enrollment or course found!');
      return;
    }

    const course = selectedEnrollment.course;
    const isMonthly = course.pricingType === 'monthly';

    console.log('✅ Is Monthly:', isMonthly);

    // Auto-fill price based on course pricing type
    let priceValue = '';
    if (isMonthly && course.pricePerMonth) {
      priceValue = course.pricePerMonth;
    } else if (!isMonthly && course.pricePerLesson) {
      priceValue = course.pricePerLesson;
    }

    console.log('💵 Price Value:', priceValue);

    // Calculate months until season end
    let suggestedMonths = '';
    if (season && season.endDate) {
      const now = new Date();
      const endDate = new Date(season.endDate);
      const monthsDiff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30));
      if (monthsDiff > 0) {
        suggestedMonths = monthsDiff;
      }
    }

    // Calculate total amount
    let calculatedTotal = '';
    if (isMonthly) {
      // For monthly pricing: monthlyFee × duration
      calculatedTotal = priceValue && suggestedMonths ? priceValue * suggestedMonths : priceValue;
    } else {
      // For per-lesson pricing: just show the price per lesson
      calculatedTotal = priceValue;
    }

    const newFormData = {
      enrollmentId: enrollmentId,
      courseType: isMonthly ? 'monthly' : 'perLesson', // Store course type for conditional rendering
      monthlyFee: isMonthly ? priceValue : '', // Only set monthlyFee for monthly courses
      totalAmount: calculatedTotal,
      durationMonths: suggestedMonths
    };

    console.log('📝 Setting Form Data:', newFormData);

    setFormData((prev) => ({
      ...prev,
      ...newFormData
    }));

    // Only calculate monthly lesson details for monthly pricing courses
    if (isMonthly && suggestedMonths > 0) {
      // IMPORTANT: await this to ensure API call completes before continuing
      await calculateMonthlyLessonDetails(enrollmentId, suggestedMonths, enrollmentsToUse);
    } else {
      // Clear lesson details for per-lesson courses
      setMonthlyLessonDetails(null);
      setShowLessonDetails(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If enrollment is selected, use dedicated function
    if (name === 'enrollmentId' && value) {
      handleEnrollmentChange(value);
      return;
    }

    // If duration months changed, recalculate total amount and lesson details
    if (name === 'durationMonths' && value && formData.monthlyFee) {
      const newTotal = formData.monthlyFee * parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        totalAmount: newTotal
      }));

      // Recalculate monthly lesson details only for monthly pricing courses
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

  const handleRateDialogSubmit = () => {
    const rateValue = parseFloat(rateDialog.value);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
      setError('Lütfen geçerli bir oran girin (0-100 arası)');
      return;
    }

    // Update settings temporarily
    if (rateDialog.type === 'commission') {
      if (!settings.creditCardRates) {
        settings.creditCardRates = [];
      }
      settings.creditCardRates.push({
        installments: rateDialog.installmentCount,
        rate: rateValue
      });
    } else if (rateDialog.type === 'vat') {
      settings.vatRate = rateValue;
    }

    setSettings({ ...settings });
    setRateDialog({ open: false, type: '', value: '', installmentCount: null });

    // Trigger form submit again
    setTimeout(() => {
      document.querySelector('form').requestSubmit();
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!selectedCashRegister && formData.paymentType === 'creditCard') {
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

      const totalAmount = parseFloat(formData.totalAmount);

      // Calculate discount
      let discountAmount = 0;
      if (formData.discountType === 'percentage') {
        discountAmount = (totalAmount * parseFloat(formData.discountValue)) / 100;
      } else if (formData.discountType === 'fixed') {
        discountAmount = parseFloat(formData.discountValue) || 0;
      }

      let subtotal = totalAmount - discountAmount;

      // Calculate credit card commission (will use default rates if settings not found)
      let creditCardCommission = { rate: 0, amount: 0 };
      if (formData.paymentType === 'creditCard') {
        const commissionRate = getCreditCardCommissionRate(parseInt(formData.installmentCount));
        if (commissionRate !== null) {
          creditCardCommission.rate = commissionRate;
          creditCardCommission.amount = (subtotal * commissionRate) / 100;
        }
      }

      // Amount to charge from student (includes commission for credit card)
      let chargeAmount = subtotal + creditCardCommission.amount;

      // Calculate VAT on the charge amount (use getVatRate which has default)
      let vat = { rate: 0, amount: 0 };
      if (formData.isInvoiced) {
        vat.rate = getVatRate();
        vat.amount = (chargeAmount * vat.rate) / 100;
      }

      const installmentCount = parseInt(formData.installmentCount);

      // Create installment array
      const installments = [];

      // For credit card: create single installment (money comes in one payment)
      // For cash: create multiple installments based on frequency
      if (formData.paymentType === 'creditCard') {
        // Credit card: single installment with full amount and payment date
        installments.push({
          installmentNumber: 1,
          amount: chargeAmount,
          dueDate: new Date(formData.paymentDate),
          isPaid: false,
          paidAmount: 0,
          isInvoiced: formData.isInvoiced
        });
      } else {
        // Cash payments: create installments based on frequency
        const startDate = new Date(formData.firstInstallmentDate);

        if (formData.useCustomAmounts && formData.customInstallments.length > 0) {
          // Use custom installment amounts
          for (let i = 0; i < formData.customInstallments.length; i++) {
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
              amount: parseFloat(formData.customInstallments[i].amount),
              dueDate: dueDate,
              isPaid: false,
              paidAmount: 0,
              isInvoiced: formData.isInvoiced
            });
          }
        } else {
          // Equal installments
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
              dueDate: dueDate,
              isPaid: false,
              paidAmount: 0,
              isInvoiced: formData.isInvoiced
            });
          }
        }
      }

      // Check if payment date is today for credit card
      const today = new Date().toISOString().split('T')[0];
      const shouldProcessImmediately = formData.paymentType === 'creditCard' && formData.paymentDate === today;

      const paymentPlanData = {
        student: studentId,
        enrollment: formData.enrollmentId,
        course: selectedEnrollment.course._id,
        paymentType: formData.paymentType,
        totalAmount: totalAmount,
        discountedAmount: chargeAmount,
        installments: installments,
        creditCardInstallments: formData.paymentType === 'creditCard' ? installmentCount : undefined,
        creditCardCommission: formData.paymentType === 'creditCard' ? creditCardCommission : undefined,
        vat: formData.isInvoiced ? vat : undefined,
        isInvoiced: formData.isInvoiced,
        institution: institution._id,
        season: season._id,
        notes: formData.description,
        createdBy: user?.username || 'System',
        // For credit card payments, auto-create payment only if date is today
        autoCreatePayment: shouldProcessImmediately,
        paymentDate: formData.paymentType === 'creditCard' ? formData.paymentDate : undefined,
        cashRegister: formData.paymentType === 'creditCard' ? selectedCashRegister : undefined
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

  const totalAmount = parseFloat(formData.totalAmount) || 0;

  // Calculate discount
  let discountAmount = 0;
  if (formData.discountType === 'percentage') {
    discountAmount = (totalAmount * parseFloat(formData.discountValue)) / 100;
  } else if (formData.discountType === 'fixed') {
    discountAmount = parseFloat(formData.discountValue) || 0;
  }

  let subtotal = totalAmount - discountAmount;

  // Calculate credit card commission
  let commissionRate = 0;
  let commissionAmount = 0;
  if (formData.paymentType === 'creditCard' && formData.installmentCount) {
    commissionRate = getCreditCardCommissionRate(parseInt(formData.installmentCount));
    commissionAmount = (subtotal * commissionRate) / 100;
  }

  // Amount to charge from student
  const chargeAmount = subtotal + commissionAmount;

  // Calculate VAT on charge amount
  let vatRate = settings?.vatRate || 10;
  let vatAmount = 0;
  if (formData.isInvoiced) {
    vatAmount = (chargeAmount * vatRate) / 100;
  }

  const finalAmount = chargeAmount;
  const installmentAmount = formData.installmentCount
    ? (finalAmount / parseInt(formData.installmentCount)).toFixed(2)
    : 0;

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/students/${studentId}`)}
        >
          Geri
        </Button>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ödeme Planı Oluştur
        </Typography>

        {student && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="h6">
              {student.firstName} {student.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mevcut Bakiye:{' '}
              <span style={{ fontWeight: 'bold' }}>
                ₺{Math.abs(student.balance || 0).toLocaleString('tr-TR')}
              </span>
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {enrollments.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Bu öğrenci henüz hiçbir derse kayıtlı değil. Ödeme planı oluşturmak için önce öğrenciyi bir derse kaydetmelisiniz.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Ders</InputLabel>
                <Select
                  name="enrollmentId"
                  value={formData.enrollmentId}
                  onChange={handleChange}
                  label="Ders"
                  disabled={enrollments.length === 0}
                >
                  {enrollments.map((enrollment) => (
                    <MenuItem key={enrollment._id} value={enrollment._id}>
                      {enrollment.course?.name || 'İsimsiz Ders'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Show Monthly Fee field for monthly courses */}
            {formData.enrollmentId && (() => {
              // Use formData.courseType instead of looking up enrollment to avoid state sync issues
              const isMonthlyPricing = formData.courseType === 'monthly';

              return isMonthlyPricing ? (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Aylık Ders Ücreti (₺)"
                      name="monthlyFee"
                      type="number"
                      value={formData.monthlyFee}
                      onChange={(e) => {
                        const newMonthlyFee = parseFloat(e.target.value) || 0;
                        const newTotal = formData.durationMonths ? newMonthlyFee * parseFloat(formData.durationMonths) : newMonthlyFee;
                        setFormData(prev => ({
                          ...prev,
                          monthlyFee: e.target.value,
                          totalAmount: newTotal
                        }));
                      }}
                      required
                      helperText="Aylık ödenecek tutar"
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Kaç Aylık?"
                      name="durationMonths"
                      type="number"
                      value={formData.durationMonths}
                      onChange={handleChange}
                      inputProps={{ min: 1 }}
                      required
                      helperText="Kayıt süresi (ay)"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Toplam Tutar (₺)"
                      value={formData.totalAmount || 0}
                      InputProps={{
                        readOnly: true,
                      }}
                      helperText={`${formData.monthlyFee || 0} × ${formData.durationMonths || 0} ay`}
                      sx={{
                        '& .MuiInputBase-input': {
                          color: 'primary.main',
                          fontWeight: 600
                        }
                      }}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Toplam Tutar (₺)"
                      name="totalAmount"
                      type="number"
                      value={formData.totalAmount}
                      onChange={handleChange}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Kaç Aylık?"
                      name="durationMonths"
                      type="number"
                      value={formData.durationMonths}
                      onChange={handleChange}
                      inputProps={{ min: 1 }}
                      helperText="Kayıt süresi"
                    />
                  </Grid>
                </>
              );
            })()}

            {/* Monthly Lesson Details */}
            {showLessonDetails && monthlyLessonDetails && (
              <Grid item xs={12}>
                <Alert
                  severity={monthlyLessonDetails.hasSchedule ? "info" : "warning"}
                  sx={{ mb: 2 }}
                  onClose={() => setShowLessonDetails(false)}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Ders Detayları - {monthlyLessonDetails.course.name}</strong>
                  </Typography>

                  {!monthlyLessonDetails.hasSchedule && (
                    <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                      ⚠️ <strong>Bu dersin aylık programı henüz oluşturulmamış!</strong> Ders başı ücret hesaplaması için lütfen dersi aylık programa ekleyiniz.
                    </Typography>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      • <strong>Aylık Ücret:</strong> ₺{monthlyLessonDetails.course.monthlyFee.toLocaleString('tr-TR')}
                      {' '}(Ayda {monthlyLessonDetails.course.expectedLessonsPerMonth} ders varsayılarak hesaplanmıştır)
                    </Typography>
                    <Typography variant="body2">
                      • <strong>Ders Başı Ücret:</strong> ₺{monthlyLessonDetails.course.pricePerLesson.toLocaleString('tr-TR')}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>Aylık Ders Dağılımı:</Typography>
                  <Box sx={{ ml: 2, mb: 2 }}>
                    {monthlyLessonDetails.monthlyDetails.map((month) => (
                      <Typography key={month.monthIndex} variant="body2">
                        • <strong>{month.month}:</strong> {month.lessonCount > 0 ? `${month.lessonCount} ders` : 'Program oluşturulmamış'}
                        {month.lessonCount !== monthlyLessonDetails.course.expectedLessonsPerMonth && month.lessonCount > 0 && (
                          <span style={{ color: 'orange' }}>
                            {' '}(Standart: {monthlyLessonDetails.course.expectedLessonsPerMonth} ders)
                          </span>
                        )}
                      </Typography>
                    ))}
                  </Box>

                  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    <Typography variant="subtitle2" gutterBottom><strong>Fiyatlandırma Karşılaştırması:</strong></Typography>
                    <Typography variant="body2">
                      • <strong>Aylık ücret üzerinden kayıt:</strong> ₺{monthlyLessonDetails.pricing.totalByMonthly.toLocaleString('tr-TR')}
                    </Typography>
                    {monthlyLessonDetails.hasSchedule && (
                      <>
                        <Typography variant="body2">
                          • <strong>Ders başı ücret üzerinden kayıt:</strong> ₺{monthlyLessonDetails.pricing.totalByPerLesson.toLocaleString('tr-TR')}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', color: monthlyLessonDetails.pricing.recommendMonthly ? 'success.main' : 'error.main' }}>
                          {monthlyLessonDetails.pricing.recommendMonthly
                            ? '✓ Aylık ücret daha avantajlı'
                            : `⚠️ Fazla ders ücreti: ₺${Math.abs(monthlyLessonDetails.pricing.difference).toLocaleString('tr-TR')}`
                          }
                        </Typography>
                      </>
                    )}
                    {!monthlyLessonDetails.hasSchedule && (
                      <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                        <em>Ders başı ücret hesaplaması yapılamıyor (aylık program eksik)</em>
                      </Typography>
                    )}
                  </Box>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>İndirim Tipi</InputLabel>
                <Select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleChange}
                  label="İndirim Tipi"
                >
                  <MenuItem value="none">İndirimsiz</MenuItem>
                  <MenuItem value="percentage">Yüzde (%)</MenuItem>
                  <MenuItem value="fixed">Tutar (₺)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.discountType !== 'none' && (
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label={formData.discountType === 'percentage' ? 'İndirim Yüzdesi (%)' : 'İndirim Tutarı (₺)'}
                  name="discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: formData.discountType === 'percentage' ? 100 : undefined }}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Ödeme Tipi</InputLabel>
                <Select
                  name="paymentType"
                  value={formData.paymentType}
                  onChange={handleChange}
                  label="Ödeme Tipi"
                >
                  <MenuItem value="cashFull">Nakit Peşin</MenuItem>
                  <MenuItem value="cashInstallment">Nakit Taksitli</MenuItem>
                  <MenuItem value="creditCard">Kredi Kartı</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isInvoiced}
                    onChange={(e) => setFormData({ ...formData, isInvoiced: e.target.checked })}
                  />
                }
                label={`Faturalı (+%${vatRate} KDV)`}
              />
            </Grid>

            {/* Credit Card Payment Fields */}
            {formData.paymentType === 'creditCard' && (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Kasa</InputLabel>
                    <Select
                      value={selectedCashRegister}
                      onChange={(e) => setSelectedCashRegister(e.target.value)}
                      label="Kasa"
                    >
                      {cashRegisters.map((register) => (
                        <MenuItem key={register._id} value={register._id}>
                          {register.name} - Bakiye: ₺{register.balance?.toLocaleString('tr-TR')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Taksit Sayısı (Komisyon Hesabı)</InputLabel>
                    <Select
                      name="installmentCount"
                      value={formData.installmentCount}
                      onChange={handleChange}
                      label="Taksit Sayısı (Komisyon Hesabı)"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <MenuItem key={num} value={num}>
                          {num} Taksit
                        </MenuItem>
                      ))}
                    </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Banka öğrenciden kaç taksitte tahsil edecek? (Para kasaya tek seferde girecek)
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ödeme Tarihi"
                    name="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    required
                    InputLabelProps={{ shrink: true }}
                    helperText="Bugün ise hemen kasaya işlenir, ileri tarih ise o gün işlenir"
                  />
                </Grid>
              </>
            )}

            {/* Cash Installment Payment Fields */}
            {formData.paymentType === 'cashInstallment' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Taksit Sayısı</InputLabel>
                    <Select
                      name="installmentCount"
                      value={formData.installmentCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        const installmentAmount = finalAmount / count;
                        const customInst = Array.from({ length: count }, (_, i) => ({
                          number: i + 1,
                          amount: installmentAmount.toFixed(2)
                        }));
                        setFormData({
                          ...formData,
                          installmentCount: count,
                          customInstallments: customInst
                        });
                      }}
                      label="Taksit Sayısı"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <MenuItem key={num} value={num}>
                          {num} Taksit
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Ödeme Sıklığı</InputLabel>
                    <Select
                      name="installmentFrequency"
                      value={formData.installmentFrequency}
                      onChange={handleChange}
                      label="Ödeme Sıklığı"
                    >
                      <MenuItem value="monthly">Aylık</MenuItem>
                      <MenuItem value="weekly">Haftalık</MenuItem>
                      <MenuItem value="custom">Özel</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {formData.installmentFrequency === 'custom' && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Kaç günde bir?"
                      name="customFrequencyDays"
                      type="number"
                      value={formData.customFrequencyDays}
                      onChange={handleChange}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                    <DatePicker
                      label="İlk Taksit Tarihi"
                      value={formData.firstInstallmentDate}
                      onChange={(date) => setFormData({ ...formData, firstInstallmentDate: date })}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>

            {formData.totalAmount && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                {(() => {
                  // Find selected enrollment and course
                  const selectedEnrollment = enrollments.find(e => e._id === formData.enrollmentId);
                  const course = selectedEnrollment?.course;

                  // Calculate lesson details if we have all the info
                  let lessonCalculation = null;
                  if (course && formData.durationMonths && course.weeklyFrequency && course.pricingType === 'monthly') {
                    const months = parseInt(formData.durationMonths);
                    const weeksPerMonth = 4;
                    const lessonsPerWeek = course.weeklyFrequency;

                    // Simple calculation: months × 4 weeks × lessons per week
                    const estimatedLessons = months * weeksPerMonth * lessonsPerWeek;

                    // Calculate total price both ways
                    const monthlyTotal = course.pricePerMonth * months;
                    const perLessonTotal = course.pricePerLesson * estimatedLessons;
                    const difference = Math.abs(monthlyTotal - perLessonTotal);

                    // Check if course has schedule
                    const hasSchedule = course.schedule && course.schedule.trim() !== '';

                    lessonCalculation = {
                      estimatedLessons,
                      monthlyTotal,
                      perLessonTotal,
                      difference,
                      hasSchedule,
                      pricePerLesson: course.pricePerLesson,
                      pricePerMonth: course.pricePerMonth,
                      lessonsPerWeek
                    };
                  }

                  return (
                    <Box sx={{ p: 3, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        💰 Ödeme Özeti
                      </Typography>

                      {lessonCalculation && (
                        <>
                          {!lessonCalculation.hasSchedule && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                              ⚠️ Bu dersin henüz aylık programı oluşturulmamış! Ücretlendirme tam hesaplanamıyor.
                              Kesin ders başı ücret hesaplaması için önce dersin aylık programını oluşturun.
                            </Alert>
                          )}

                          <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              📊 Ders Sayısı Hesaplaması
                            </Typography>
                            <Typography variant="body2">
                              • {formData.durationMonths} ay × 4 hafta × {lessonCalculation.lessonsPerWeek} gün =
                              <strong> {lessonCalculation.estimatedLessons} ders</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              • Ders başı ücret: ₺{lessonCalculation.pricePerLesson.toLocaleString('tr-TR')}
                            </Typography>
                            <Typography variant="body2">
                              • Aylık ücret: ₺{lessonCalculation.pricePerMonth.toLocaleString('tr-TR')}
                            </Typography>
                          </Box>

                          {lessonCalculation.difference > 10 && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              💡 <strong>Ücretlendirme Karşılaştırması:</strong><br/>
                              • Aylık Ücret Üzerinden: ₺{lessonCalculation.monthlyTotal.toLocaleString('tr-TR')}<br/>
                              • Ders Başı Ücret Üzerinden: ₺{lessonCalculation.perLessonTotal.toLocaleString('tr-TR')}<br/>
                              <strong>Fark: ₺{lessonCalculation.difference.toLocaleString('tr-TR')}</strong>
                              {lessonCalculation.perLessonTotal > lessonCalculation.monthlyTotal && (
                                <span> - Bazı aylarda 5 hafta olabilir!</span>
                              )}
                            </Alert>
                          )}
                        </>
                      )}

                      <Typography variant="body1">
                        Kurs Ücreti: ₺{totalAmount.toLocaleString('tr-TR')}
                      </Typography>
                      {discountAmount > 0 && (
                        <Typography variant="body1" color="success.main">
                          İndirim ({formData.discountType === 'percentage' ? `%${formData.discountValue}` : `₺${formData.discountValue}`}): -₺{discountAmount.toLocaleString('tr-TR')}
                        </Typography>
                      )}
                      <Typography variant="body1">
                        Ara Toplam: ₺{subtotal.toLocaleString('tr-TR')}
                      </Typography>
                      {formData.paymentType === 'creditCard' && commissionAmount > 0 && (
                        <Typography variant="body1" color="warning.main">
                          Banka Komisyonu ({formData.installmentCount} taksit - %{commissionRate.toFixed(2)}): +₺{commissionAmount.toLocaleString('tr-TR')}
                        </Typography>
                      )}
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        Öğrenciden Tahsil Edilecek: ₺{chargeAmount.toLocaleString('tr-TR')}
                      </Typography>
                      {formData.isInvoiced && vatAmount > 0 && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body1" color="error.main">
                            📄 Faturalı (KDV %{vatRate}): +₺{vatAmount.toLocaleString('tr-TR')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            (₺{chargeAmount.toLocaleString('tr-TR')} üzerinden)
                          </Typography>
                        </>
                      )}
                      {formData.paymentType !== 'cashFull' && formData.installmentCount > 1 && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2">
                            Her taksit: ₺{parseFloat(installmentAmount).toLocaleString('tr-TR')}
                          </Typography>
                          <Typography variant="body2">
                            Toplam {formData.installmentCount} taksit
                          </Typography>
                        </>
                      )}
                    </Box>
                  );
                })()}
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || enrollments.length === 0}
                >
                  {loading ? 'Oluşturuluyor...' : 'Ödeme Planı Oluştur'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(`/students/${studentId}`)}
                >
                  İptal
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Rate Dialog */}
      <Dialog open={rateDialog.open} onClose={() => setRateDialog({ ...rateDialog, open: false })}>
        <DialogTitle>
          {rateDialog.type === 'commission'
            ? `${rateDialog.installmentCount} Taksit Komisyon Oranı Tanımlı Değil`
            : 'KDV Oranı Tanımlı Değil'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {rateDialog.type === 'commission'
              ? `${rateDialog.installmentCount} taksit için kredi kartı komisyon oranı ayarlarda tanımlanmamış. Lütfen bu ödeme için kullanılacak oranı girin.`
              : 'KDV oranı ayarlarda tanımlanmamış. Lütfen bu ödeme için kullanılacak KDV oranını girin.'}
          </Alert>
          <TextField
            autoFocus
            fullWidth
            label={rateDialog.type === 'commission' ? 'Komisyon Oranı (%)' : 'KDV Oranı (%)'}
            type="number"
            value={rateDialog.value}
            onChange={(e) => setRateDialog({ ...rateDialog, value: e.target.value })}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialog({ ...rateDialog, open: false })}>
            İptal
          </Button>
          <Button onClick={handleRateDialogSubmit} variant="contained">
            Devam Et
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PaymentPlan;
