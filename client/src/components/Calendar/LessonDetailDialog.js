import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Close,
  Edit,
  Delete,
  Save,
  Calculate,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';
import LoadingSpinner from '../Common/LoadingSpinner';

const LessonDetailDialog = ({ open, onClose, lesson, onUpdated, onDeleted }) => {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [status, setStatus] = useState('scheduled');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && lesson) {
      loadLessonDetails();
    }
  }, [open, lesson]);

  const loadLessonDetails = async () => {
    try {
      setLoading(true);

      // Get full lesson details
      const lessonRes = await api.get(`/scheduled-lessons/${lesson._id}`);
      setLessonData(lessonRes.data);
      setStatus(lessonRes.data.status);

      // Get enrolled students for this course
      const enrollmentsRes = await api.get('/enrollments', {
        params: {
          courseId: lesson.course._id,
          isActive: true
        }
      });
      setEnrolledStudents(enrollmentsRes.data);

      // Get attendance records for this lesson
      const attendanceRes = await api.get('/attendance', {
        params: {
          scheduledLessonId: lesson._id
        }
      });

      // Build attendance map
      const attendanceMap = {};
      attendanceRes.data.forEach(att => {
        attendanceMap[att.student._id || att.student] = att.attended;
      });
      setAttendance(attendanceMap);

    } catch (error) {
      console.error('Error loading lesson details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        status: newStatus,
        updatedBy: user?.username
      });
      setStatus(newStatus);
      onUpdated();
    } catch (error) {
      alert('Durum güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAttendanceChange = (studentId, attended) => {
    setAttendance({
      ...attendance,
      [studentId]: attended
    });
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);

      // Save attendance for each student
      const promises = enrolledStudents.map(async (enrollment) => {
        const studentId = enrollment.student._id;
        const attended = attendance[studentId] || false;

        // Check if attendance record exists
        const existingAttendance = await api.get('/attendance', {
          params: {
            scheduledLessonId: lesson._id,
            studentId: studentId
          }
        });

        if (existingAttendance.data.length > 0) {
          // Update existing
          await api.put(`/attendance/${existingAttendance.data[0]._id}`, {
            attended,
            updatedBy: user?.username
          });
        } else {
          // Create new
          await api.post('/attendance', {
            scheduledLesson: lesson._id,
            student: studentId,
            attended,
            createdBy: user?.username
          });
        }
      });

      await Promise.all(promises);
      alert('Yoklama başarıyla kaydedildi!');
      onUpdated();
    } catch (error) {
      alert('Yoklama kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateInstructorPayment = async () => {
    try {
      if (!lessonData.instructor) {
        alert('Bu dersin eğitmeni belirtilmemiş!');
        return;
      }

      // Get instructor details
      const instructorRes = await api.get(`/instructors/${lessonData.instructor._id}`);
      const instructor = instructorRes.data;

      let paymentAmount = 0;

      // Calculate based on payment type
      switch (instructor.paymentType) {
        case 'perLesson':
          paymentAmount = instructor.paymentAmount;
          break;
        case 'hourly':
          // Calculate hours between start and end time
          const [startHour, startMin] = lessonData.startTime.split(':').map(Number);
          const [endHour, endMin] = lessonData.endTime.split(':').map(Number);
          const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
          paymentAmount = hours * instructor.paymentAmount;
          break;
        case 'perStudent':
          // Count attending students
          const attendingCount = Object.values(attendance).filter(a => a).length;
          paymentAmount = attendingCount * instructor.paymentAmount;
          break;
        case 'monthly':
          alert('Aylık ödemeli eğitmenler için ders bazında ücret hesaplanmaz.');
          return;
        default:
          alert('Bilinmeyen ödeme tipi!');
          return;
      }

      // Update lesson with payment amount
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        instructorPaymentCalculated: true,
        instructorPaymentAmount: paymentAmount,
        updatedBy: user?.username
      });

      // Update instructor balance
      await api.put(`/instructors/${lessonData.instructor._id}`, {
        balance: instructor.balance + paymentAmount,
        updatedBy: user?.username
      });

      alert(`Eğitmen ödemesi hesaplandı: ₺${paymentAmount.toFixed(2)}`);
      loadLessonDetails();
      onUpdated();
    } catch (error) {
      alert('Ödeme hesaplanırken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteLesson = async () => {
    if (!window.confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.delete(`/scheduled-lessons/${lesson._id}`, {
        data: { deletedBy: user?.username }
      });
      alert('Ders başarıyla silindi!');
      onDeleted();
    } catch (error) {
      alert('Ders silinirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <LoadingSpinner message="Ders bilgileri yükleniyor..." />
        </DialogContent>
      </Dialog>
    );
  }

  if (!lessonData) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'postponed':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Planlandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'postponed':
        return 'Ertelendi';
      default:
        return status;
    }
  };

  const getPaymentTypeLabel = (type) => {
    switch (type) {
      case 'perLesson':
        return 'Ders Başı';
      case 'hourly':
        return 'Saat Başı';
      case 'perStudent':
        return 'Öğrenci Başı';
      case 'monthly':
        return 'Aylık';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Ders Detayları</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Lesson Information */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {lessonData.course?.name || 'Ders'}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Tarih
                    </Typography>
                    <Typography variant="body1">
                      {new Date(lessonData.date).toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Saat
                    </Typography>
                    <Typography variant="body1">
                      {lessonData.startTime} - {lessonData.endTime}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Eğitmen
                    </Typography>
                    <Typography variant="body1">
                      {lessonData.instructor
                        ? `${lessonData.instructor.firstName} ${lessonData.instructor.lastName}`
                        : 'Belirtilmemiş'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Durum
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={getStatusLabel(status)}
                        color={getStatusColor(status)}
                        size="small"
                      />
                    </Box>
                  </Grid>
                  {lessonData.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Notlar
                      </Typography>
                      <Typography variant="body1">{lessonData.notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Status Update */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Durum Güncelle
                </Typography>
                <TextField
                  select
                  fullWidth
                  label="Ders Durumu"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  size="small"
                >
                  <MenuItem value="scheduled">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" />
                      Planlandı
                    </Box>
                  </MenuItem>
                  <MenuItem value="completed">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle fontSize="small" />
                      Tamamlandı
                    </Box>
                  </MenuItem>
                  <MenuItem value="cancelled">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cancel fontSize="small" />
                      İptal Edildi
                    </Box>
                  </MenuItem>
                  <MenuItem value="postponed">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" />
                      Ertelendi
                    </Box>
                  </MenuItem>
                </TextField>
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Section */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Yoklama
                </Typography>
                {enrolledStudents.length === 0 ? (
                  <Typography color="text.secondary" align="center">
                    Bu derse kayıtlı öğrenci bulunmuyor
                  </Typography>
                ) : (
                  <>
                    <List>
                      {enrolledStudents.map((enrollment) => (
                        <ListItem key={enrollment._id} divider>
                          <ListItemText
                            primary={
                              enrollment.student?.firstName && enrollment.student?.lastName
                                ? `${enrollment.student.firstName} ${enrollment.student.lastName}`
                                : 'Öğrenci'
                            }
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={attendance[enrollment.student._id] || false}
                                onChange={(e) =>
                                  handleAttendanceChange(enrollment.student._id, e.target.checked)
                                }
                              />
                            }
                            label="Katıldı"
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSaveAttendance}
                        disabled={saving}
                      >
                        {saving ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Instructor Payment Section */}
          {lessonData.instructor && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Eğitmen Ödemesi
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Ödeme Tipi
                      </Typography>
                      <Typography variant="body1">
                        {getPaymentTypeLabel(lessonData.instructor.paymentType)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Ödeme Tutarı (Birim)
                      </Typography>
                      <Typography variant="body1">
                        ₺{lessonData.instructor.paymentAmount?.toLocaleString('tr-TR') || 0}
                      </Typography>
                    </Grid>
                    {lessonData.instructorPaymentCalculated && (
                      <Grid item xs={12}>
                        <Alert severity="success">
                          Bu ders için eğitmen ödemesi hesaplandı: ₺
                          {lessonData.instructorPaymentAmount?.toFixed(2) || 0}
                        </Alert>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<Calculate />}
                        onClick={handleCalculateInstructorPayment}
                        disabled={lessonData.instructorPaymentCalculated}
                        fullWidth
                      >
                        {lessonData.instructorPaymentCalculated
                          ? 'Ödeme Hesaplandı'
                          : 'Eğitmen Ödemesini Hesapla'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          startIcon={<Delete />}
          color="error"
          onClick={handleDeleteLesson}
        >
          Sil
        </Button>
        <Button
          startIcon={<Edit />}
          variant="outlined"
          onClick={() => {
            // TODO: Open edit dialog
            alert('Düzenleme özelliği yakında eklenecek');
          }}
        >
          Düzenle
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LessonDetailDialog;
