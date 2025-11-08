import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Phone,
  Email,
  Payment,
  Undo,
  Add,
  Archive,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import RefundDialog from '../components/Payment/RefundDialog';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, institution } = useApp();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [refundDialog, setRefundDialog] = useState({
    open: false,
    payment: null
  });
  const [archiveDialog, setArchiveDialog] = useState({
    open: false,
    reason: ''
  });

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const [studentRes, coursesRes, paymentsRes, paymentPlansRes, cashRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/enrollments`, { params: { studentId: id } }),
        api.get(`/payments`, { params: { studentId: id } }),
        api.get(`/payment-plans`, { params: { studentId: id } }),
        api.get(`/cash-registers`, { params: { institution: institution._id } }),
      ]);
      setStudent(studentRes.data);
      setCourses(coursesRes.data);
      setPayments(paymentsRes.data);
      setPaymentPlans(paymentPlansRes.data);
      setCashRegisters(cashRes.data);
    } catch (error) {
      console.error('Error loading student:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (data) => {
    try {
      await api.post(`/payments/${refundDialog.payment._id}/refund`, {
        ...data,
        createdBy: user?.username
      });

      alert('Ödeme başarıyla iade edildi');
      setRefundDialog({ open: false, payment: null });
      loadStudent();
    } catch (error) {
      alert(error.response?.data?.message || 'İade işlemi sırasında hata oluştu');
    }
  };

  const handleOpenRefundDialog = (payment) => {
    setRefundDialog({
      open: true,
      payment: payment
    });
  };

  const handleArchive = async () => {
    try {
      await api.post(`/students/${id}/archive`, {
        reason: archiveDialog.reason,
        archivedBy: user?.username
      });
      alert('Öğrenci başarıyla arşivlendi');
      navigate('/students');
    } catch (error) {
      alert('Arşivleme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Öğrenci bilgileri yükleniyor..." />;
  }

  if (!student) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Öğrenci bulunamadı
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/students')}>
          Geri
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Öğrenci Detayı
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => navigate(`/students/${id}/edit`)}
        >
          Düzenle
        </Button>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<Archive />}
          onClick={() => setArchiveDialog({ open: true, reason: '' })}
        >
          Arşivle
        </Button>
        <Button
          variant="contained"
          startIcon={<Payment />}
          onClick={() => navigate(`/payment-plan/${id}`)}
        >
          Ödeme Al
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Student Info Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: '2.5rem',
                  bgcolor: 'primary.main',
                  mb: 2,
                }}
              >
                {student.firstName.charAt(0)}
                {student.lastName.charAt(0)}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {student.firstName} {student.lastName}
              </Typography>
              <Chip
                label={
                  student.status === 'active'
                    ? 'Aktif'
                    : student.status === 'passive'
                    ? 'Pasif'
                    : 'Deneme'
                }
                color={student.status === 'active' ? 'success' : 'default'}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <List>
              <ListItem>
                <ListItemText
                  primary="TC Kimlik No"
                  secondary={student.tcNumber || '-'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Doğum Tarihi"
                  secondary={
                    student.birthDate
                      ? new Date(student.birthDate).toLocaleDateString('tr-TR')
                      : '-'
                  }
                />
              </ListItem>
              <ListItem>
                <Phone sx={{ mr: 2, color: 'action.active' }} />
                <ListItemText primary="Telefon" secondary={student.phone || '-'} />
              </ListItem>
              <ListItem>
                <Email sx={{ mr: 2, color: 'action.active' }} />
                <ListItemText primary="E-posta" secondary={student.email || '-'} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Adres" secondary={student.address || '-'} />
              </ListItem>
            </List>
          </Paper>

          {/* Balance Card */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bakiye Durumu
            </Typography>
            <Typography
              variant="h3"
              color={student.balance > 0 ? 'error.main' : 'success.main'}
            >
              {student.balance > 0 ? '-' : ''}₺
              {Math.abs(student.balance || 0).toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {student.balance > 0 ? 'Borç' : 'Alacak'}
            </Typography>
          </Paper>
        </Grid>

        {/* Tabs Section */}
        <Grid item xs={12} md={8}>
          <Paper>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Kurs Kayıtları" />
              <Tab label="Ödeme Planları" />
              <Tab label="Ödeme Geçmişi" />
              <Tab label="Yoklama Geçmişi" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Courses Tab */}
              {tabValue === 0 && (
                <Box>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => navigate(`/enrollments/new?studentId=${id}`)}
                    >
                      Kursa Kaydet
                    </Button>
                  </Box>
                  {courses.length === 0 ? (
                    <Typography color="text.secondary" align="center">
                      Henüz kurs kaydı bulunmuyor
                    </Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {courses.map((enrollment) => (
                        <Grid item xs={12} key={enrollment._id}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6">
                                {enrollment.course?.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Eğitmen: {enrollment.course?.instructor?.name || '-'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Kayıt Tarihi:{' '}
                                {new Date(enrollment.enrollmentDate).toLocaleDateString(
                                  'tr-TR'
                                )}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {/* Payment Plans Tab */}
              {tabValue === 1 && (
                <Box>
                  {paymentPlans.length === 0 ? (
                    <Typography color="text.secondary" align="center">
                      Henüz ödeme planı bulunmuyor
                    </Typography>
                  ) : (
                    <List>
                      {paymentPlans.map((plan) => (
                        <React.Fragment key={plan._id}>
                          <ListItem
                            alignItems="flex-start"
                            button
                            onClick={() => navigate(`/payment-plan-detail/${plan._id}`)}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="h6">
                                    {plan.course?.name || 'Ders'}
                                  </Typography>
                                  <Typography variant="h6" color="primary">
                                    ₺{plan.discountedAmount?.toLocaleString('tr-TR') || 0}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    Ödeme Tipi: {
                                      plan.paymentType === 'cashFull' ? 'Nakit Peşin' :
                                      plan.paymentType === 'cashInstallment' ? 'Nakit Taksitli' :
                                      'Kredi Kartı'
                                    }
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Taksit: {plan.installments?.length || 0} /
                                    Ödenen: {plan.installments?.filter(i => i.isPaid).length || 0}
                                  </Typography>
                                  <Typography variant="body2" color={plan.remainingAmount > 0 ? 'error' : 'success.main'}>
                                    Kalan: ₺{plan.remainingAmount?.toLocaleString('tr-TR') || 0}
                                  </Typography>
                                  {plan.isInvoiced && (
                                    <Chip label="Faturalı" size="small" color="info" sx={{ mt: 0.5 }} />
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Payments Tab */}
              {tabValue === 2 && (
                <Box>
                  {payments.length === 0 ? (
                    <Typography color="text.secondary" align="center">
                      Henüz ödeme kaydı bulunmuyor
                    </Typography>
                  ) : (
                    <List>
                      {payments.map((payment) => (
                        <React.Fragment key={payment._id}>
                          <ListItem
                            secondaryAction={
                              !payment.isRefunded && (
                                <Button
                                  startIcon={<Undo />}
                                  size="small"
                                  color="error"
                                  onClick={() => handleOpenRefundDialog(payment)}
                                >
                                  İade Et
                                </Button>
                              )
                            }
                          >
                            <ListItemText
                              primary={`₺${payment.amount.toLocaleString('tr-TR')}`}
                              secondary={`${new Date(payment.date).toLocaleDateString(
                                'tr-TR'
                              )} - ${
                                payment.paymentMethod === 'cash'
                                  ? 'Nakit'
                                  : payment.paymentMethod === 'creditCard'
                                  ? 'Kredi Kartı'
                                  : 'Havale/EFT'
                              }${payment.isRefunded ? ' (İade Edildi)' : ''}`}
                            />
                            <Chip
                              label={payment.isRefunded ? 'İade Edildi' : payment.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                              color={payment.isRefunded ? 'error' : payment.status === 'completed' ? 'success' : 'warning'}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Attendance Tab */}
              {tabValue === 3 && (
                <Box>
                  <Typography color="text.secondary" align="center">
                    Yoklama geçmişi yakında eklenecek
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Archive Dialog */}
      <Dialog
        open={archiveDialog.open}
        onClose={() => setArchiveDialog({ open: false, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Öğrenciyi Arşivle</DialogTitle>
        <DialogContent>
          {student.balance > 0 && (
            <Typography color="warning.main" sx={{ mb: 2, mt: 1 }}>
              ⚠️ Bu öğrencinin {student.balance.toLocaleString('tr-TR')} TL ödenmemiş borcu var!
              Arşivlenen öğrencilerin borçları takip edilmeye devam edilir.
            </Typography>
          )}
          <TextField
            fullWidth
            label="Arşivleme Sebebi (Opsiyonel)"
            multiline
            rows={3}
            value={archiveDialog.reason}
            onChange={(e) => setArchiveDialog({ ...archiveDialog, reason: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialog({ open: false, reason: '' })}>
            İptal
          </Button>
          <Button
            onClick={handleArchive}
            variant="contained"
            color="warning"
          >
            Arşivle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <RefundDialog
        open={refundDialog.open}
        onClose={() => setRefundDialog({ open: false, payment: null })}
        payment={refundDialog.payment}
        cashRegisters={cashRegisters}
        onSubmit={handleRefund}
      />
    </Box>
  );
};

export default StudentDetail;
