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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Phone,
  Email,
  Add,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const InstructorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, institution, season } = useApp();
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [payments, setPayments] = useState([]);
  const [lessonHistory, setLessonHistory] = useState([]);
  const [unpaidLessons, setUnpaidLessons] = useState([]);
  const [statistics, setStatistics] = useState({
    totalPaid: 0,
    balance: 0,
    completedLessons: 0,
    totalHours: 0,
    expectedPayment: null,
    paymentType: '',
    paymentAmount: 0
  });
  const [cashRegisters, setCashRegisters] = useState([]);
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    amount: '',
    cashRegisterId: '',
    description: ''
  });
  const [payLessonDialog, setPayLessonDialog] = useState({
    open: false,
    lesson: null,
    cashRegisterId: ''
  });

  useEffect(() => {
    loadInstructor();
  }, [id]);

  const loadInstructor = async () => {
    try {
      setLoading(true);
      const [detailsRes, cashRes, lessonsRes] = await Promise.all([
        api.get(`/instructors/${id}/details`),
        api.get(`/cash-registers`, { params: { institution: institution._id } }),
        api.get(`/scheduled-lessons`, {
          params: {
            instructorId: id,
            institution: institution._id,
            season: season._id
          }
        }),
      ]);

      setInstructor(detailsRes.data.instructor);
      setPayments(detailsRes.data.payments || []);
      setStatistics(detailsRes.data.statistics || {});
      setCashRegisters(cashRes.data);

      // Filter and sort lessons - only confirmed lessons
      const confirmedLessons = lessonsRes.data
        .filter(l => l.instructorConfirmed)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setLessonHistory(confirmedLessons);

      // Separate unpaid lessons (completed but payment not made yet)
      const unpaid = lessonsRes.data
        .filter(l =>
          l.instructorConfirmed &&
          l.status === 'completed' &&
          l.instructorPaymentCalculated === true &&
          l.instructorPaymentAmount > 0
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setUnpaidLessons(unpaid);

      // Calculate total hours from confirmed lessons
      const totalHours = confirmedLessons.reduce((sum, lesson) => {
        return sum + (lesson.actualDuration || 0);
      }, 0);

      setStatistics(prev => ({ ...prev, totalHours }));

      if (cashRes.data.length > 0) {
        setPaymentDialog(prev => ({ ...prev, cashRegisterId: cashRes.data[0]._id }));
      }
    } catch (error) {
      console.error('Error loading instructor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    try {
      if (!paymentDialog.amount || parseFloat(paymentDialog.amount) <= 0) {
        alert('Lütfen geçerli bir tutar giriniz');
        return;
      }

      if (!paymentDialog.cashRegisterId) {
        alert('Lütfen bir kasa seçiniz');
        return;
      }

      await api.post('/expenses', {
        category: 'Eğitmen Ödemesi',
        amount: parseFloat(paymentDialog.amount),
        description: paymentDialog.description || `${instructor.firstName} ${instructor.lastName} - Eğitmen ödemesi`,
        expenseDate: new Date(),
        cashRegister: paymentDialog.cashRegisterId,
        instructor: id,
        institution: institution._id,
        season: season._id,
        createdBy: user?.username
      });

      alert('Ödeme başarıyla kaydedildi');
      setPaymentDialog({ open: false, amount: '', cashRegisterId: cashRegisters[0]?._id || '', description: '' });
      loadInstructor(); // Reload to show new payment
    } catch (error) {
      alert('Ödeme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePayLesson = async () => {
    try {
      const { lesson, cashRegisterId } = payLessonDialog;

      if (!cashRegisterId) {
        alert('Lütfen bir kasa seçiniz');
        return;
      }

      if (!lesson || !lesson.instructorPaymentAmount) {
        alert('Ödeme tutarı bulunamadı');
        return;
      }

      // Create expense record
      await api.post('/expenses', {
        category: 'Eğitmen Ödemesi',
        amount: lesson.instructorPaymentAmount,
        description: `${lesson.course?.name || 'Ders'} - ${new Date(lesson.date).toLocaleDateString('tr-TR')} - ${instructor.firstName} ${instructor.lastName} (${lesson.actualDuration || 0} saat)`,
        expenseDate: new Date(),
        cashRegister: cashRegisterId,
        instructor: id,
        institution: institution._id,
        season: season._id,
        createdBy: user?.username
      });

      // Update instructor balance (subtract paid amount)
      await api.put(`/instructors/${id}`, {
        balance: instructor.balance - lesson.instructorPaymentAmount,
        updatedBy: user?.username
      });

      alert(`Ödeme başarıyla yapıldı! ₺${lesson.instructorPaymentAmount.toFixed(2)}`);
      setPayLessonDialog({ open: false, lesson: null, cashRegisterId: '' });
      loadInstructor(); // Reload to update balance and lesson list
    } catch (error) {
      alert('Ödeme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Eğitmen bilgileri yükleniyor..." />;
  }

  if (!instructor) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Eğitmen bulunamadı
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/instructors')}>
          Geri
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Eğitmen Detayı
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => navigate('/instructors')}
        >
          Düzenle
        </Button>
        <Button
          variant="contained"
          startIcon={<PaymentIcon />}
          onClick={() => setPaymentDialog({ ...paymentDialog, open: true })}
        >
          Ödeme Yap
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Instructor Info Card */}
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
                {instructor.firstName?.charAt(0)}
                {instructor.lastName?.charAt(0)}
              </Avatar>
              <Typography variant="h5" gutterBottom>
                {instructor.firstName} {instructor.lastName}
              </Typography>
              <Chip
                label={
                  instructor.paymentType === 'monthly' ? 'Aylık' :
                  instructor.paymentType === 'perLesson' ? 'Ders Başı' :
                  instructor.paymentType === 'hourly' ? 'Saatlik' :
                  instructor.paymentType === 'perStudent' ? 'Öğrenci Başı' : 'Diğer'
                }
                color="primary"
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <List>
              <ListItem>
                <ListItemText
                  primary="TC Kimlik No"
                  secondary={instructor.tcNo || '-'}
                />
              </ListItem>
              <ListItem>
                <Phone sx={{ mr: 2, color: 'action.active' }} />
                <ListItemText primary="Telefon" secondary={instructor.phone || '-'} />
              </ListItem>
              <ListItem>
                <Email sx={{ mr: 2, color: 'action.active' }} />
                <ListItemText primary="E-posta" secondary={instructor.email || '-'} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Adres" secondary={instructor.address || '-'} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Ödeme Tutarı"
                  secondary={`₺${(instructor.paymentAmount || 0).toLocaleString('tr-TR')}`}
                />
              </ListItem>
            </List>

            {instructor.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Notlar:</strong> {instructor.notes}
                </Typography>
              </>
            )}
          </Paper>

          {/* Balance Card */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Bakiye Durumu
            </Typography>
            <Typography
              variant="h3"
              color={statistics.balance > 0 ? 'error.main' : 'success.main'}
            >
              {statistics.balance > 0 ? '+' : ''}₺
              {Math.abs(statistics.balance || 0).toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {statistics.balance > 0 ? 'Borcumuz' : 'Ödendi'}
            </Typography>
          </Paper>

          {/* Statistics Card */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              İstatistikler
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Toplam Ödenen"
                  secondary={`₺${(statistics.totalPaid || 0).toLocaleString('tr-TR')}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Tamamlanan Dersler"
                  secondary={statistics.completedLessons || 0}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Toplam Eğitim Saati"
                  secondary={`${(statistics.totalHours || 0).toFixed(1)} saat`}
                />
              </ListItem>
              {statistics.expectedPayment && (
                <ListItem>
                  <ListItemText
                    primary="Beklenen Ödeme (Ders Başı)"
                    secondary={`₺${(statistics.expectedPayment || 0).toLocaleString('tr-TR')}`}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Tabs Section */}
        <Grid item xs={12} md={8}>
          <Paper>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Ödeme Geçmişi" />
              <Tab label={`Ödenmemiş Dersler (${unpaidLessons.length})`} />
              <Tab label="Tüm Dersler" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Payments Tab */}
              {tabValue === 0 && (
                <Box>
                  {payments.length === 0 ? (
                    <Typography color="text.secondary" align="center">
                      Henüz ödeme kaydı bulunmuyor
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Tarih</TableCell>
                            <TableCell>Açıklama</TableCell>
                            <TableCell>Tutar</TableCell>
                            <TableCell>Kasa</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment._id}>
                              <TableCell>
                                {new Date(payment.expenseDate).toLocaleDateString('tr-TR')}
                              </TableCell>
                              <TableCell>{payment.description}</TableCell>
                              <TableCell>
                                <Typography color="error.main" fontWeight="bold">
                                  ₺{payment.amount.toLocaleString('tr-TR')}
                                </Typography>
                              </TableCell>
                              <TableCell>{payment.cashRegister?.name || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Unpaid Lessons Tab */}
              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Ödenme Bekleyen Dersler
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tamamlanmış ancak henüz ödeme yapılmamış dersler
                  </Typography>

                  {unpaidLessons.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
                      Ödenecek ders bulunmuyor
                    </Typography>
                  ) : (
                    <>
                      <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
                        <Typography variant="subtitle2">
                          Toplam Borç: <strong>₺{unpaidLessons.reduce((sum, l) => sum + (l.instructorPaymentAmount || 0), 0).toLocaleString('tr-TR')}</strong>
                        </Typography>
                        <Typography variant="caption">
                          {unpaidLessons.length} adet ders için ödeme bekleniyor
                        </Typography>
                      </Alert>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tarih</TableCell>
                              <TableCell>Ders</TableCell>
                              <TableCell>Süre</TableCell>
                              <TableCell>Tutar</TableCell>
                              <TableCell>İşlem</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {unpaidLessons.map((lesson) => (
                              <TableRow key={lesson._id}>
                                <TableCell>
                                  {new Date(lesson.date).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {lesson.course?.name || 'Ders'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {lesson.startTime} - {lesson.endTime}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="primary">
                                    {lesson.actualDuration || 0} saat
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="error" fontWeight="bold">
                                    ₺{(lesson.instructorPaymentAmount || 0).toLocaleString('tr-TR')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<PaymentIcon />}
                                    onClick={() => {
                                      setPayLessonDialog({
                                        open: true,
                                        lesson: lesson,
                                        cashRegisterId: cashRegisters[0]?._id || ''
                                      });
                                    }}
                                  >
                                    Öde
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </Box>
              )}

              {/* All Lessons Tab */}
              {tabValue === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Ders Geçmişi
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Sadece eğitmen onayı verilen dersler gösterilir
                  </Typography>

                  {lessonHistory.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
                      Henüz onaylanmış ders bulunmuyor
                    </Typography>
                  ) : (
                    <>
                      <Box sx={{ mb: 2, mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                        <Typography variant="subtitle1" color="primary.contrastText">
                          Toplam {lessonHistory.length} ders - {statistics.totalHours.toFixed(1)} saat
                        </Typography>
                      </Box>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tarih</TableCell>
                              <TableCell>Ders</TableCell>
                              <TableCell>Saat</TableCell>
                              <TableCell>Süre</TableCell>
                              <TableCell>Durum</TableCell>
                              <TableCell>Ödeme</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {lessonHistory.map((lesson) => (
                              <TableRow key={lesson._id}>
                                <TableCell>
                                  {new Date(lesson.date).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {lesson.course?.name || 'Ders'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {lesson.startTime} - {lesson.endTime}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="primary">
                                    {lesson.actualDuration
                                      ? `${lesson.actualDuration} saat`
                                      : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={lesson.status === 'completed' ? 'Tamamlandı' : lesson.status}
                                    color={lesson.status === 'completed' ? 'success' : 'default'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  {lesson.instructorPaymentCalculated ? (
                                    <Typography variant="body2" color="success.main" fontWeight="bold">
                                      ₺{(lesson.instructorPaymentAmount || 0).toLocaleString('tr-TR')}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Bekliyor
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Pay Lesson Dialog */}
      <Dialog
        open={payLessonDialog.open}
        onClose={() => setPayLessonDialog({ ...payLessonDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ders Ödemesi Yap</DialogTitle>
        <DialogContent>
          {payLessonDialog.lesson && (
            <>
              <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {payLessonDialog.lesson.course?.name || 'Ders'}
                </Typography>
                <Typography variant="body2">
                  Tarih: {new Date(payLessonDialog.lesson.date).toLocaleDateString('tr-TR')}
                </Typography>
                <Typography variant="body2">
                  Süre: {payLessonDialog.lesson.actualDuration || 0} saat
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Tutar: ₺{(payLessonDialog.lesson.instructorPaymentAmount || 0).toLocaleString('tr-TR')}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Kasa Seç</InputLabel>
                    <Select
                      value={payLessonDialog.cashRegisterId}
                      onChange={(e) => setPayLessonDialog({ ...payLessonDialog, cashRegisterId: e.target.value })}
                      label="Kasa Seç"
                    >
                      {cashRegisters.map((register) => (
                        <MenuItem key={register._id} value={register._id}>
                          {register.name} - Bakiye: ₺{register.balance?.toLocaleString('tr-TR')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayLessonDialog({ open: false, lesson: null, cashRegisterId: '' })}>
            İptal
          </Button>
          <Button
            onClick={handlePayLesson}
            variant="contained"
            color="success"
            startIcon={<PaymentIcon />}
          >
            Ödeme Yap
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ ...paymentDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Eğitmen Ödemesi</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar (₺)"
                type="number"
                value={paymentDialog.amount}
                onChange={(e) => setPaymentDialog({ ...paymentDialog, amount: e.target.value })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Kasa</InputLabel>
                <Select
                  value={paymentDialog.cashRegisterId}
                  onChange={(e) => setPaymentDialog({ ...paymentDialog, cashRegisterId: e.target.value })}
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                multiline
                rows={3}
                value={paymentDialog.description}
                onChange={(e) => setPaymentDialog({ ...paymentDialog, description: e.target.value })}
                placeholder={`${instructor.firstName} ${instructor.lastName} - Eğitmen ödemesi`}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ ...paymentDialog, open: false })}>
            İptal
          </Button>
          <Button
            onClick={handleCreatePayment}
            variant="contained"
            color="primary"
          >
            Ödeme Yap
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstructorDetail;
