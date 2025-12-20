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
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Phone,
  Email,
  Payment,
  Add,
  Archive,
  Delete,
  AccountBalance,
  Refresh,
  LocalOffer,
  School,
  Person,
  ContactPhone,
  Home,
  MedicalServices,
  Notifications,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Cancel,
  CalendarToday,
  AccessTime,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import RefundDialog from '../components/Payment/RefundDialog';

// Helper function to get discount chip color based on percentage (light blue to dark blue)
const getDiscountChipColor = (percentage) => {
  const lightness = Math.max(35, 70 - (percentage * 0.35));
  return `hsl(210, 79%, ${lightness}%)`;
};

// Helper to get discount chip for a payment plan
const getPaymentPlanDiscountChip = (plan) => {
  if (!plan.totalAmount || !plan.discountedAmount) return null;
  const discountAmount = plan.totalAmount - plan.discountedAmount;
  if (discountAmount <= 0) return null;

  // Calculate percentage
  const percentage = Math.round((discountAmount / plan.totalAmount) * 1000) / 10;

  // Check if full scholarship (100% discount or discountedAmount is 0)
  if (plan.discountType === 'fullScholarship' || percentage >= 99) {
    return (
      <Chip
        icon={<School sx={{ fontSize: 14 }} />}
        label="Burslu"
        color="success"
        size="small"
        sx={{ ml: 1 }}
      />
    );
  }

  return (
    <Chip
      icon={<LocalOffer sx={{ fontSize: 14, color: 'white' }} />}
      label={`%${percentage} indirim`}
      size="small"
      sx={{
        ml: 1,
        bgcolor: getDiscountChipColor(percentage),
        color: 'white',
        '& .MuiChip-label': { color: 'white' }
      }}
    />
  );
};

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

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
  const [availableCourses, setAvailableCourses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState({
    open: false,
    courseId: '',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [refundDialog, setRefundDialog] = useState({
    open: false,
    payment: null
  });
  const [archiveDialog, setArchiveDialog] = useState({
    open: false,
    reason: ''
  });
  const [unenrollDialog, setUnenrollDialog] = useState({
    open: false,
    enrollment: null
  });
  const [balanceDialog, setBalanceDialog] = useState({
    open: false,
    adjustment: '',
    reason: '',
    password: '',
    error: ''
  });
  const [recalculateDialog, setRecalculateDialog] = useState({
    open: false,
    username: '',
    password: '',
    error: '',
    loading: false,
    result: null
  });

  // Expanded sections for additional info
  const [parentInfoExpanded, setParentInfoExpanded] = useState(false);
  const [emergencyExpanded, setEmergencyExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    loadStudent();
  }, [id]);

  useEffect(() => {
    if (tabValue === 2 && student) {
      loadAttendanceHistory();
    }
  }, [tabValue, student]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const [studentRes, coursesRes, paymentsRes, paymentPlansRes, cashRes, allCoursesRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/enrollments`, { params: { studentId: id } }),
        api.get(`/payments`, { params: { studentId: id } }),
        api.get(`/payment-plans`, { params: { studentId: id } }),
        api.get(`/cash-registers`, { params: { institution: institution._id } }),
        api.get(`/courses`, { params: { institution: institution._id } }),
      ]);
      setStudent(studentRes.data);
      setCourses(coursesRes.data);
      setPayments(paymentsRes.data);
      setPaymentPlans(paymentPlansRes.data);
      setCashRegisters(cashRes.data);
      setAvailableCourses(allCoursesRes.data);
    } catch (error) {
      console.error('Error loading student:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      setAttendanceLoading(true);
      const response = await api.get('/attendance', {
        params: { studentId: id }
      });
      // Sort by date descending
      const sorted = response.data.sort((a, b) => {
        const dateA = new Date(a.scheduledLesson?.date || 0);
        const dateB = new Date(b.scheduledLesson?.date || 0);
        return dateB - dateA;
      });
      setAttendanceRecords(sorted);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleEnrollStudent = async () => {
    try {
      // Get active season
      const seasonsRes = await api.get('/seasons', { params: { institution: institution._id } });
      const activeSeason = seasonsRes.data.find(s => s.isActive);

      if (!activeSeason) {
        alert('Aktif sezon bulunamadı. Lütfen önce bir sezon oluşturun ve aktif edin.');
        return;
      }

      await api.post('/enrollments', {
        student: id,
        course: enrollDialog.courseId,
        enrollmentDate: enrollDialog.startDate,
        institution: institution._id,
        season: activeSeason._id,
        createdBy: user?.username
      });
      setEnrollDialog({ open: false, courseId: '', startDate: new Date().toISOString().split('T')[0] });
      loadStudent(); // Reload to show new enrollment
      alert('Öğrenci başarıyla kursa kaydedildi!');
    } catch (error) {
      alert('Kayıt hatası: ' + (error.response?.data?.message || error.message));
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

  const handleUnenroll = async () => {
    try {
      await api.delete(`/enrollments/${unenrollDialog.enrollment._id}`, {
        data: { deletedBy: user?.username }
      });
      alert('Öğrenci başarıyla kurstan çıkarıldı');
      setUnenrollDialog({ open: false, enrollment: null });
      loadStudent(); // Reload to update the list
    } catch (error) {
      alert('Kurstan çıkarma hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleBalanceAdjustment = async () => {
    try {
      const adjustment = parseFloat(balanceDialog.adjustment);
      if (isNaN(adjustment) || adjustment === 0) {
        setBalanceDialog(prev => ({ ...prev, error: 'Geçerli bir tutar girin' }));
        return;
      }

      if (!balanceDialog.reason.trim()) {
        setBalanceDialog(prev => ({ ...prev, error: 'Düzenleme sebebi zorunludur' }));
        return;
      }

      if (!balanceDialog.password) {
        setBalanceDialog(prev => ({ ...prev, error: 'Şifre gereklidir' }));
        return;
      }

      const response = await api.post(`/students/${id}/adjust-balance`, {
        adjustment,
        reason: balanceDialog.reason,
        password: balanceDialog.password,
        username: user?.username,
        updatedBy: user?.username
      });

      alert(`Bakiye başarıyla güncellendi: ${response.data.adjustmentDetails.oldBalance} → ${response.data.adjustmentDetails.newBalance}`);
      setBalanceDialog({ open: false, adjustment: '', reason: '', password: '', error: '' });
      loadStudent();
    } catch (error) {
      setBalanceDialog(prev => ({
        ...prev,
        error: error.response?.data?.message || 'Bakiye güncellenirken hata oluştu'
      }));
    }
  };

  const handleRecalculateBalance = async () => {
    try {
      if (!recalculateDialog.username) {
        setRecalculateDialog(prev => ({ ...prev, error: 'Kullanıcı adı gereklidir' }));
        return;
      }

      if (!recalculateDialog.password) {
        setRecalculateDialog(prev => ({ ...prev, error: 'Şifre gereklidir' }));
        return;
      }

      setRecalculateDialog(prev => ({ ...prev, loading: true, error: '' }));

      const response = await api.post(`/students/${id}/recalculate-balance`, {
        password: recalculateDialog.password,
        username: recalculateDialog.username,
        updatedBy: recalculateDialog.username
      });

      setRecalculateDialog(prev => ({
        ...prev,
        loading: false,
        result: response.data.recalculationDetails
      }));

      // Reload student data
      loadStudent();

    } catch (error) {
      console.error('Recalculate balance error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      let errorMessage = 'Bakiye hesaplanırken hata oluştu';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setRecalculateDialog(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
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

  // Extract parent contacts
  const mother = student.parentContacts?.find(p => p.relationship === 'Anne');
  const father = student.parentContacts?.find(p => p.relationship === 'Baba');
  const emergencyContact = student.emergencyContact;

  // Calculate attendance statistics
  const attendedCount = attendanceRecords.filter(a => a.attended).length;
  const totalLessons = attendanceRecords.length;
  const attendanceRate = totalLessons > 0 ? Math.round((attendedCount / totalLessons) * 100) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
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
          Ödeme Planı Oluştur
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
              <Box sx={{ display: 'flex', gap: 1 }}>
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
                {student.dateOfBirth && (
                  <Chip
                    label={`${calculateAge(student.dateOfBirth)} yaş`}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Basic Info */}
            <List dense>
              <ListItem>
                <ListItemIcon><Person color="action" /></ListItemIcon>
                <ListItemText
                  primary="TC Kimlik No"
                  secondary={student.tcNo || '-'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><CalendarToday color="action" /></ListItemIcon>
                <ListItemText
                  primary="Doğum Tarihi"
                  secondary={
                    student.dateOfBirth
                      ? new Date(student.dateOfBirth).toLocaleDateString('tr-TR')
                      : '-'
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><Phone color="action" /></ListItemIcon>
                <ListItemText
                  primary="Telefon"
                  secondary={student.phone || '-'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon><Email color="action" /></ListItemIcon>
                <ListItemText primary="E-posta" secondary={student.email || '-'} />
              </ListItem>
              <ListItem>
                <ListItemIcon><Home color="action" /></ListItemIcon>
                <ListItemText primary="Adres" secondary={student.address || '-'} />
              </ListItem>
            </List>

            {/* Parent Info - Collapsible */}
            {(mother || father) && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', py: 1 }}
                  onClick={() => setParentInfoExpanded(!parentInfoExpanded)}
                >
                  <ContactPhone color="action" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>Veli Bilgileri</Typography>
                  <IconButton size="small">
                    {parentInfoExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={parentInfoExpanded}>
                  <Box sx={{ pl: 2 }}>
                    {mother && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">Anne</Typography>
                        <Typography variant="body2">{mother.name || '-'}</Typography>
                        {mother.phone && (
                          <Typography variant="body2" color="primary">
                            <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {mother.phone}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {father && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Baba</Typography>
                        <Typography variant="body2">{father.name || '-'}</Typography>
                        {father.phone && (
                          <Typography variant="body2" color="primary">
                            <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                            {father.phone}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </>
            )}

            {/* Emergency Contact - Collapsible */}
            {emergencyContact && emergencyContact.name && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', py: 1 }}
                  onClick={() => setEmergencyExpanded(!emergencyExpanded)}
                >
                  <MedicalServices color="error" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>Acil Durum</Typography>
                  <IconButton size="small">
                    {emergencyExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={emergencyExpanded}>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body2">{emergencyContact.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {emergencyContact.relationship || 'Yakın'}
                    </Typography>
                    {emergencyContact.phone && (
                      <Typography variant="body2" color="error">
                        <Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {emergencyContact.phone}
                      </Typography>
                    )}
                    {emergencyContact.email && (
                      <Typography variant="body2" color="text.secondary">
                        <Email sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />
                        {emergencyContact.email}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </>
            )}

            {/* Health Notes & Other Notes - Collapsible */}
            {(student.healthNotes || student.notes) && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', py: 1 }}
                  onClick={() => setNotesExpanded(!notesExpanded)}
                >
                  <MedicalServices color="warning" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>Notlar</Typography>
                  <IconButton size="small">
                    {notesExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={notesExpanded}>
                  <Box sx={{ pl: 2 }}>
                    {student.healthNotes && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="error">Sağlık Notları</Typography>
                        <Typography variant="body2">{student.healthNotes}</Typography>
                      </Box>
                    )}
                    {student.notes && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Diğer Notlar</Typography>
                        <Typography variant="body2">{student.notes}</Typography>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </>
            )}

            {/* Notification Settings */}
            {student.defaultNotificationRecipient && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                  <Notifications color="action" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Bildirimler: {
                      student.defaultNotificationRecipient === 'mother' ? 'Anne' :
                      student.defaultNotificationRecipient === 'father' ? 'Baba' :
                      'Öğrenci'
                    }
                  </Typography>
                </Box>
              </>
            )}
          </Paper>

          {/* Balance Card */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">
                Bakiye Durumu
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={() => setRecalculateDialog({ open: true, username: '', password: '', error: '', loading: false, result: null })}
                  color="secondary"
                >
                  Yeniden Hesapla
                </Button>
                <Button
                  size="small"
                  startIcon={<AccountBalance />}
                  onClick={() => setBalanceDialog({ ...balanceDialog, open: true })}
                >
                  Düzenle
                </Button>
              </Box>
            </Box>
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
              <Tab label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Yoklama Geçmişi
                  {totalLessons > 0 && (
                    <Chip
                      label={`%${attendanceRate}`}
                      size="small"
                      color={attendanceRate >= 80 ? 'success' : attendanceRate >= 60 ? 'warning' : 'error'}
                    />
                  )}
                </Box>
              } />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Courses Tab */}
              {tabValue === 0 && (
                <Box>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setEnrollDialog({ ...enrollDialog, open: true })}
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
                                Eğitmen: {enrollment.course?.instructor ?
                                  `${enrollment.course.instructor.firstName || ''} ${enrollment.course.instructor.lastName || ''}`.trim() || '-'
                                  : '-'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Kayıt Tarihi:{' '}
                                {new Date(enrollment.enrollmentDate).toLocaleDateString(
                                  'tr-TR'
                                )}
                              </Typography>
                            </CardContent>
                            <CardActions>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<Delete />}
                                onClick={() => setUnenrollDialog({ open: true, enrollment: enrollment })}
                              >
                                Kurstan Çıkar
                              </Button>
                            </CardActions>
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
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Typography variant="h6">
                                      {plan.course?.name || 'Ders'}
                                    </Typography>
                                    {getPaymentPlanDiscountChip(plan)}
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                    {plan.totalAmount && plan.discountedAmount && plan.totalAmount > plan.discountedAmount ? (
                                      <>
                                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                          ₺{plan.totalAmount?.toLocaleString('tr-TR')}
                                        </Typography>
                                        <Typography variant="h6" color="success.main">
                                          ₺{plan.discountedAmount?.toLocaleString('tr-TR')}
                                        </Typography>
                                      </>
                                    ) : (
                                      <Typography variant="h6" color="primary">
                                        ₺{plan.discountedAmount?.toLocaleString('tr-TR') || plan.totalAmount?.toLocaleString('tr-TR') || 0}
                                      </Typography>
                                    )}
                                  </Box>
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

              {/* Attendance Tab */}
              {tabValue === 2 && (
                <Box>
                  {attendanceLoading ? (
                    <LoadingSpinner message="Yoklama geçmişi yükleniyor..." />
                  ) : attendanceRecords.length === 0 ? (
                    <Typography color="text.secondary" align="center">
                      Henüz yoklama kaydı bulunmuyor
                    </Typography>
                  ) : (
                    <>
                      {/* Summary */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: 'center', bgcolor: 'success.50' }}>
                          <Typography variant="h4" color="success.main">{attendedCount}</Typography>
                          <Typography variant="caption">Katıldı</Typography>
                        </Paper>
                        <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: 'center', bgcolor: 'error.50' }}>
                          <Typography variant="h4" color="error.main">{totalLessons - attendedCount}</Typography>
                          <Typography variant="caption">Katılmadı</Typography>
                        </Paper>
                        <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: 'center', bgcolor: 'info.50' }}>
                          <Typography variant="h4" color="info.main">%{attendanceRate}</Typography>
                          <Typography variant="caption">Katılım Oranı</Typography>
                        </Paper>
                      </Box>

                      {/* Attendance Table */}
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tarih</TableCell>
                              <TableCell>Ders</TableCell>
                              <TableCell>Saat</TableCell>
                              <TableCell align="center">Durum</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {attendanceRecords.map((record) => (
                              <TableRow key={record._id}>
                                <TableCell>
                                  {record.scheduledLesson?.date
                                    ? new Date(record.scheduledLesson.date).toLocaleDateString('tr-TR', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {record.scheduledLesson?.course?.name || '-'}
                                </TableCell>
                                <TableCell>
                                  {record.scheduledLesson?.startTime && record.scheduledLesson?.endTime
                                    ? `${record.scheduledLesson.startTime} - ${record.scheduledLesson.endTime}`
                                    : '-'}
                                </TableCell>
                                <TableCell align="center">
                                  {record.attended ? (
                                    <Chip
                                      icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                      label="Katıldı"
                                      color="success"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      icon={<Cancel sx={{ fontSize: 16 }} />}
                                      label="Katılmadı"
                                      color="error"
                                      size="small"
                                      variant="outlined"
                                    />
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
              Bu öğrencinin {student.balance.toLocaleString('tr-TR')} TL ödenmemiş borcu var!
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

      {/* Enrollment Dialog */}
      <Dialog
        open={enrollDialog.open}
        onClose={() => setEnrollDialog({ ...enrollDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kursa Kaydet</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Ders Seçin"
                value={enrollDialog.courseId}
                onChange={(e) => setEnrollDialog({ ...enrollDialog, courseId: e.target.value })}
                required
              >
                {availableCourses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Başlangıç Tarihi"
                value={enrollDialog.startDate}
                onChange={(e) => setEnrollDialog({ ...enrollDialog, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialog({ ...enrollDialog, open: false })}>
            İptal
          </Button>
          <Button
            onClick={handleEnrollStudent}
            variant="contained"
            disabled={!enrollDialog.courseId}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unenroll Confirmation Dialog */}
      <Dialog
        open={unenrollDialog.open}
        onClose={() => setUnenrollDialog({ open: false, enrollment: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kurstan Çıkar</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            <strong>{student?.firstName} {student?.lastName}</strong> isimli öğrenciyi{' '}
            <strong>{unenrollDialog.enrollment?.course?.name}</strong> dersinden çıkarmak istediğinize emin misiniz?
          </Typography>
          <Typography color="warning.main" sx={{ mt: 2 }}>
            Bu işlem geri alınamaz. Öğrenci tekrar kursa kaydedilmek istenirse yeniden kayıt yapılması gerekecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnenrollDialog({ open: false, enrollment: null })}>
            İptal
          </Button>
          <Button
            onClick={handleUnenroll}
            variant="contained"
            color="error"
          >
            Kurstan Çıkar
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

      {/* Balance Adjustment Dialog */}
      <Dialog
        open={balanceDialog.open}
        onClose={() => setBalanceDialog({ open: false, adjustment: '', reason: '', password: '', error: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manuel Bakiye Düzenleme</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mevcut Bakiye: <strong>{student?.balance > 0 ? '-' : ''}₺{Math.abs(student?.balance || 0).toLocaleString('tr-TR')}</strong>
              {' '}({student?.balance > 0 ? 'Borç' : 'Alacak'})
            </Typography>

            {balanceDialog.error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {balanceDialog.error}
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Düzenleme Tutarı (₺)"
                  type="number"
                  value={balanceDialog.adjustment}
                  onChange={(e) => setBalanceDialog({ ...balanceDialog, adjustment: e.target.value, error: '' })}
                  helperText="Pozitif değer: Borç ekler, Negatif değer: Borç azaltır"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Düzenleme Sebebi"
                  multiline
                  rows={2}
                  value={balanceDialog.reason}
                  onChange={(e) => setBalanceDialog({ ...balanceDialog, reason: e.target.value, error: '' })}
                  placeholder="Örn: Sistem hatası düzeltmesi, Ödeme planı silindi"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Şifreniz"
                  type="password"
                  value={balanceDialog.password}
                  onChange={(e) => setBalanceDialog({ ...balanceDialog, password: e.target.value, error: '' })}
                  helperText={`Kullanıcı: ${user?.username} (Sadece admin/superadmin yetkisi gerekir)`}
                  required
                />
              </Grid>
            </Grid>

            {balanceDialog.adjustment && !isNaN(parseFloat(balanceDialog.adjustment)) && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Önizleme:</strong>
                </Typography>
                <Typography variant="body2">
                  Mevcut: {student?.balance > 0 ? '-' : ''}₺{Math.abs(student?.balance || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2">
                  Düzenleme: {parseFloat(balanceDialog.adjustment) > 0 ? '+' : ''}₺{parseFloat(balanceDialog.adjustment).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="primary">
                  Yeni Bakiye: {((student?.balance || 0) + parseFloat(balanceDialog.adjustment)) > 0 ? '-' : ''}₺
                  {Math.abs((student?.balance || 0) + parseFloat(balanceDialog.adjustment)).toLocaleString('tr-TR')}
                  {' '}({((student?.balance || 0) + parseFloat(balanceDialog.adjustment)) > 0 ? 'Borç' : 'Alacak'})
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBalanceDialog({ open: false, adjustment: '', reason: '', password: '', error: '' })}>
            İptal
          </Button>
          <Button
            onClick={handleBalanceAdjustment}
            variant="contained"
            disabled={!balanceDialog.adjustment || !balanceDialog.reason || !balanceDialog.password}
          >
            Bakiyeyi Güncelle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recalculate Balance Dialog */}
      <Dialog
        open={recalculateDialog.open}
        onClose={() => setRecalculateDialog({ open: false, username: '', password: '', error: '', loading: false, result: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Refresh color="secondary" />
            Bakiye Yeniden Hesapla
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bu işlem, öğrencinin bakiyesini tüm ödeme planlarından yeniden hesaplar.
              Manuel silme işlemlerinden kaynaklanan tutarsızlıkları düzeltir.
            </Typography>

            <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <strong>Dikkat:</strong> Bu işlem mevcut bakiyeyi ödeme planlarındaki{' '}
              (Toplam Tutar - Ödenen Tutar) formülüyle yeniden hesaplar.
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
              Mevcut Bakiye: <strong>{student?.balance > 0 ? '-' : ''}₺{Math.abs(student?.balance || 0).toLocaleString('tr-TR')}</strong>
              {' '}({student?.balance > 0 ? 'Borç' : 'Alacak'})
            </Typography>

            {recalculateDialog.error && (
              <Typography color="error" sx={{ mb: 2 }}>
                {recalculateDialog.error}
              </Typography>
            )}

            {recalculateDialog.result ? (
              <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Bakiye Başarıyla Yeniden Hesaplandı
                </Typography>
                <Typography variant="body2">
                  Eski Bakiye: ₺{recalculateDialog.result.oldBalance?.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2">
                  Yeni Bakiye: ₺{recalculateDialog.result.newBalance?.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" fontWeight="bold" color={recalculateDialog.result.difference !== 0 ? 'error.main' : 'success.main'}>
                  Fark: {recalculateDialog.result.difference > 0 ? '+' : ''}₺{recalculateDialog.result.difference?.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Taranan Ödeme Planı: {recalculateDialog.result.paymentPlansScanned}
                </Typography>
                {recalculateDialog.result.planDetails?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Plan Detayları:</Typography>
                    {recalculateDialog.result.planDetails.map((plan, idx) => (
                      <Typography key={idx} variant="caption" display="block">
                        • Toplam: ₺{plan.discountedAmount?.toLocaleString('tr-TR')} -
                        Ödenen: ₺{plan.paidAmount?.toLocaleString('tr-TR')} =
                        Kalan: ₺{plan.remainingDebt?.toLocaleString('tr-TR')}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Admin Kullanıcı Adı"
                    value={recalculateDialog.username}
                    onChange={(e) => setRecalculateDialog(prev => ({ ...prev, username: e.target.value, error: '' }))}
                    required
                    disabled={recalculateDialog.loading}
                    autoFocus
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Admin Şifresi"
                    type="password"
                    value={recalculateDialog.password}
                    onChange={(e) => setRecalculateDialog(prev => ({ ...prev, password: e.target.value, error: '' }))}
                    helperText="Sadece admin/superadmin yetkisi gerekir"
                    required
                    disabled={recalculateDialog.loading}
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecalculateDialog({ open: false, username: '', password: '', error: '', loading: false, result: null })}>
            {recalculateDialog.result ? 'Kapat' : 'İptal'}
          </Button>
          {!recalculateDialog.result && (
            <Button
              onClick={handleRecalculateBalance}
              variant="contained"
              color="secondary"
              disabled={!recalculateDialog.username || !recalculateDialog.password || recalculateDialog.loading}
            >
              {recalculateDialog.loading ? 'Hesaplanıyor...' : 'Yeniden Hesapla'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentDetail;
