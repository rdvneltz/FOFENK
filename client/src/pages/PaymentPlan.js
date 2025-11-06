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
    discountAmount: 0,
    paymentType: 'cashFull',
    installmentCount: 1,
    description: '',
  });
  const [cashRegisters, setCashRegisters] = useState([]);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentRes, enrollmentsRes, cashRes] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get('/enrollments', {
          params: { studentId, seasonId: season._id },
        }),
        api.get('/cash-registers', {
          params: { institution: institution._id },
        }),
      ]);
      setStudent(studentRes.data);
      setEnrollments(enrollmentsRes.data);
      setCashRegisters(cashRes.data);

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
      const discountAmount = parseFloat(formData.discountAmount) || 0;
      const discountedAmount = totalAmount - discountAmount;
      const installmentCount = parseInt(formData.installmentCount);
      const installmentAmount = discountedAmount / installmentCount;

      // Create installment array
      const installments = [];
      const today = new Date();
      for (let i = 0; i < installmentCount; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(today.getMonth() + i);
        installments.push({
          installmentNumber: i + 1,
          amount: installmentAmount,
          dueDate: dueDate,
          isPaid: false,
          paidAmount: 0
        });
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
  const discountAmount = parseFloat(formData.discountAmount) || 0;
  const discountedAmount = totalAmount - discountAmount;
  const installmentAmount = formData.installmentCount
    ? (discountedAmount / parseInt(formData.installmentCount)).toFixed(2)
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

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="İndirim Tutarı (₺)"
                name="discountAmount"
                type="number"
                value={formData.discountAmount}
                onChange={handleChange}
              />
            </Grid>

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
              <FormControl fullWidth required>
                <InputLabel>Taksit Sayısı</InputLabel>
                <Select
                  name="installmentCount"
                  value={formData.installmentCount}
                  onChange={handleChange}
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
                      İndirim: -₺{discountAmount.toLocaleString('tr-TR')}
                    </Typography>
                  )}
                  <Typography variant="body1" fontWeight="bold">
                    Ödenecek: ₺{discountedAmount.toLocaleString('tr-TR')}
                  </Typography>
                  {formData.installmentCount > 1 && (
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
