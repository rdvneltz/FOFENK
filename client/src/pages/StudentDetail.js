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
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Phone,
  Email,
  Payment,
} from '@mui/icons-material';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const [studentRes, coursesRes, paymentsRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/enrollments?student=${id}`),
        api.get(`/payments?student=${id}`),
      ]);
      setStudent(studentRes.data);
      setCourses(coursesRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error loading student:', error);
    } finally {
      setLoading(false);
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
              <Tab label="Ödeme Geçmişi" />
              <Tab label="Yoklama Geçmişi" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Courses Tab */}
              {tabValue === 0 && (
                <Box>
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

              {/* Payments Tab */}
              {tabValue === 1 && (
                <Box>
                  {payments.length === 0 ? (
                    <Typography color="text.secondary" align="center">
                      Henüz ödeme kaydı bulunmuyor
                    </Typography>
                  ) : (
                    <List>
                      {payments.map((payment) => (
                        <React.Fragment key={payment._id}>
                          <ListItem>
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
                              }`}
                            />
                            <Chip
                              label={payment.status === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                              color={payment.status === 'completed' ? 'success' : 'warning'}
                              size="small"
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
                  <Typography color="text.secondary" align="center">
                    Yoklama geçmişi yakında eklenecek
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDetail;
