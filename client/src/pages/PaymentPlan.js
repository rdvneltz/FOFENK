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
  const { institution, season } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [formData, setFormData] = useState({
    enrollmentId: '',
    totalAmount: '',
    discountType: 'none', // 'none', 'percentage', 'fixed'
    discountValue: 0,
    paymentType: 'cashFull',
    installmentCount: 1,
    firstInstallmentDate: new Date(),
    installmentFrequency: 'monthly', // 'monthly', 'weekly', 'custom'
    customFrequencyDays: 30,
    useCustomAmounts: false,
    customInstallments: [],
    isInvoiced: false,
    description: '',
  });
  const [settings, setSettings] = useState({
    vat: 10,
    creditCardCommissionRates: {}
  });
  const [cashRegisters, setCashRegisters] = useState([]);

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

      // Load settings (VAT and commission rates)
      if (settingsRes.data) {
        const vatSetting = settingsRes.data.find(s => s.key === 'vat');
        const commissionSetting = settingsRes.data.find(s => s.key === 'creditCardCommissionRates');
        setSettings({
          vat: vatSetting ? parseFloat(vatSetting.value) : 10,
          creditCardCommissionRates: commissionSetting ? JSON.parse(commissionSetting.value) : {}
        });
      }

      // Set first enrollment as default
      if (enrollmentsRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, enrollmentId: enrollmentsRes.data[0]._id }));
      }
    } catch (error) {
      setError('Veri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

      const totalAmount = parseFloat(formData.totalAmount);

      // Calculate discount
      let discountAmount = 0;
      if (formData.discountType === 'percentage') {
        discountAmount = (totalAmount * parseFloat(formData.discountValue)) / 100;
      } else if (formData.discountType === 'fixed') {
        discountAmount = parseFloat(formData.discountValue) || 0;
      }

      let discountedAmount = totalAmount - discountAmount;

      // Add VAT if invoiced
      let vatAmount = 0;
      if (formData.isInvoiced) {
        vatAmount = (discountedAmount * settings.vat) / 100;
        discountedAmount += vatAmount;
      }

      const installmentCount = parseInt(formData.installmentCount);

      // Add credit card commission
      let creditCardCommission = { rate: 0, amount: 0 };
      if (formData.paymentType === 'creditCard') {
        const commissionRate = settings.creditCardCommissionRates[installmentCount] || 0;
        creditCardCommission.rate = commissionRate;
        creditCardCommission.amount = (discountedAmount * commissionRate) / 100;
        discountedAmount += creditCardCommission.amount;
      }
      // Create installment array
      const installments = [];
      const startDate = new Date(formData.firstInstallmentDate);

      if (formData.useCustomAmounts && formData.customInstallments.length > 0) {
        // Use custom installment amounts
        for (let i = 0; i < formData.customInstallments.length; i++) {
          const dueDate = new Date(startDate);

          // Calculate due date based on frequency
          if (formData.installmentFrequency === 'weekly') {
            dueDate.setDate(startDate.getDate() + (i * 7));
          } else if (formData.installmentFrequency === 'custom') {
            dueDate.setDate(startDate.getDate() + (i * parseInt(formData.customFrequencyDays)));
          } else {
            // Monthly
            dueDate.setMonth(startDate.getMonth() + i);
          }

          installments.push({
            installmentNumber: i + 1,
            amount: parseFloat(formData.customInstallments[i].amount),
            dueDate: dueDate,
            isPaid: false,
            paidAmount: 0
          });
        }
      } else {
        // Equal installments
        const installmentAmount = discountedAmount / installmentCount;
        for (let i = 0; i < installmentCount; i++) {
          const dueDate = new Date(startDate);

          // Calculate due date based on frequency
          if (formData.installmentFrequency === 'weekly') {
            dueDate.setDate(startDate.getDate() + (i * 7));
          } else if (formData.installmentFrequency === 'custom') {
            dueDate.setDate(startDate.getDate() + (i * parseInt(formData.customFrequencyDays)));
          } else {
            // Monthly
            dueDate.setMonth(startDate.getMonth() + i);
          }

          installments.push({
            installmentNumber: i + 1,
            amount: installmentAmount,
            dueDate: dueDate,
            isPaid: false,
            paidAmount: 0
          });
        }
      }

      const paymentPlanData = {
        student: studentId,
        enrollment: formData.enrollmentId,
        course: selectedEnrollment.course._id,
        paymentType: formData.paymentType,
        totalAmount: totalAmount,
        discountedAmount: discountedAmount,
        installments: installments,
        creditCardInstallments: formData.paymentType === 'creditCard' ? installmentCount : undefined,
        creditCardCommission: formData.paymentType === 'creditCard' ? creditCardCommission : undefined,
        vat: formData.isInvoiced ? { rate: settings.vat, amount: vatAmount } : undefined,
        isInvoiced: formData.isInvoiced,
        institution: institution._id,
        season: season._id,
        notes: formData.description,
        createdBy: 'user'
      };

      await api.post('/payment-plans', paymentPlanData);
      navigate(`/students/${studentId}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
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

  // Calculate VAT
  let vatAmount = 0;
  if (formData.isInvoiced) {
    vatAmount = (subtotal * settings.vat) / 100;
  }

  // Calculate credit card commission
  let commissionAmount = 0;
  if (formData.paymentType === 'creditCard' && formData.installmentCount) {
    const commissionRate = settings.creditCardCommissionRates[formData.installmentCount] || 0;
    commissionAmount = ((subtotal + vatAmount) * commissionRate) / 100;
  }

  const finalAmount = subtotal + vatAmount + commissionAmount;
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

            <Grid item xs={12} sm={6}>
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

            {formData.paymentType !== 'cashFull' && (
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
                      {[1, 2, 3, 4, 5, 6, 9, 12].map((num) => (
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
              </>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Fatura</InputLabel>
                <Select
                  name="isInvoiced"
                  value={formData.isInvoiced}
                  onChange={(e) => setFormData({ ...formData, isInvoiced: e.target.value === 'true' })}
                  label="Fatura"
                >
                  <MenuItem value={false}>Faturasız</MenuItem>
                  <MenuItem value={true}>Faturalı (+%{settings.vat} KDV)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.paymentType !== 'cashFull' && (
              <>
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

                <Grid item xs={12}>
                  <FormControl>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={formData.useCustomAmounts}
                        onChange={(e) => setFormData({ ...formData, useCustomAmounts: e.target.checked })}
                        style={{ marginRight: '8px' }}
                      />
                      <Typography>Taksit tutarlarını özelleştir</Typography>
                    </Box>
                  </FormControl>
                </Grid>

                {formData.useCustomAmounts && formData.customInstallments.length > 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Taksit Tutarları
                      </Typography>
                      <Grid container spacing={2}>
                        {formData.customInstallments.map((inst, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <TextField
                              fullWidth
                              label={`${inst.number}. Taksit`}
                              type="number"
                              value={inst.amount}
                              onChange={(e) => {
                                const newCustomInstallments = [...formData.customInstallments];
                                newCustomInstallments[index].amount = e.target.value;
                                setFormData({ ...formData, customInstallments: newCustomInstallments });
                              }}
                              inputProps={{ min: 0, step: '0.01' }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Toplam: ₺{formData.customInstallments.reduce((sum, inst) => sum + parseFloat(inst.amount || 0), 0).toLocaleString('tr-TR')}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
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
                <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h6">
                    Özet
                  </Typography>
                  <Typography variant="body1">
                    Toplam Tutar: ₺{totalAmount.toLocaleString('tr-TR')}
                  </Typography>
                  {discountAmount > 0 && (
                    <Typography variant="body1" color="success.main">
                      İndirim ({formData.discountType === 'percentage' ? `%${formData.discountValue}` : `₺${formData.discountValue}`}): -₺{discountAmount.toLocaleString('tr-TR')}
                    </Typography>
                  )}
                  <Typography variant="body1">
                    Ara Toplam: ₺{subtotal.toLocaleString('tr-TR')}
                  </Typography>
                  {formData.isInvoiced && vatAmount > 0 && (
                    <Typography variant="body1" color="warning.main">
                      KDV (%{settings.vat}): +₺{vatAmount.toLocaleString('tr-TR')}
                    </Typography>
                  )}
                  {formData.paymentType === 'creditCard' && commissionAmount > 0 && (
                    <Typography variant="body1" color="warning.main">
                      Kredi Kartı Komisyonu ({settings.creditCardCommissionRates[formData.installmentCount] || 0}%): +₺{commissionAmount.toLocaleString('tr-TR')}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Ödenecek Toplam: ₺{finalAmount.toLocaleString('tr-TR')}
                  </Typography>
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
    </Container>
  );
};

export default PaymentPlan;
