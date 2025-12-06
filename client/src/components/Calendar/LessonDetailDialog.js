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
  FormControl,
  InputLabel,
  Select,
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
  Add,
  PersonAdd,
  RemoveCircle,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';
import LoadingSpinner from '../Common/LoadingSpinner';
import CompleteLessonDialog from './CompleteLessonDialog';
import EditLessonDialog from './EditLessonDialog';

const LessonDetailDialog = ({ open, onClose, lesson, onUpdated, onDeleted }) => {
  const { user, institution, season } = useApp();
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [instructorConfirmed, setInstructorConfirmed] = useState(false);
  // Additional instructors (max 2)
  const [additionalInstructors, setAdditionalInstructors] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [status, setStatus] = useState('scheduled');
  const [saving, setSaving] = useState(false);
  const [completeLessonOpen, setCompleteLessonOpen] = useState(false);
  const [editLessonOpen, setEditLessonOpen] = useState(false);

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
      setSelectedInstructor(lessonRes.data.instructor?._id || '');
      setInstructorConfirmed(lessonRes.data.instructorConfirmed || false);
      // Load additional instructors
      setAdditionalInstructors(lessonRes.data.additionalInstructors || []);

      // Get enrolled students for this course
      const enrollmentsRes = await api.get('/enrollments', {
        params: {
          courseId: lesson.course._id,
          isActive: true
        }
      });
      setEnrolledStudents(enrollmentsRes.data);

      // Get all instructors for this institution/season
      const instructorsRes = await api.get('/instructors', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      setInstructors(instructorsRes.data);

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
    // If completing lesson, check instructor confirmation first
    if (newStatus === 'completed') {
      if (!selectedInstructor) {
        alert('Dersi tamamlamak için bir eğitmen seçmelisiniz!');
        return;
      }
      if (!instructorConfirmed) {
        alert('Dersi tamamlamak için ana eğitmenin derse girdiğini onaylamalısınız!');
        return;
      }

      // Open complete lesson dialog
      setCompleteLessonOpen(true);
      return;
    }

    // For other status changes, just update
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

  const handleInstructorChange = async (newInstructorId) => {
    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        instructor: newInstructorId || null,
        updatedBy: user?.username
      });
      setSelectedInstructor(newInstructorId);
      loadLessonDetails(); // Reload to get new instructor details
      onUpdated();
    } catch (error) {
      alert('Eğitmen güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleInstructorConfirmation = async (confirmed) => {
    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        instructorConfirmed: confirmed,
        updatedBy: user?.username
      });
      setInstructorConfirmed(confirmed);
      onUpdated();
    } catch (error) {
      alert('Eğitmen onayı güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Additional instructors management
  const handleAddAdditionalInstructor = async () => {
    if (additionalInstructors.length >= 2) {
      alert('En fazla 2 ek eğitmen ekleyebilirsiniz!');
      return;
    }
    // Add empty slot
    const newAdditional = {
      instructor: '',
      confirmed: false,
      paymentCalculated: false,
      paymentAmount: 0
    };
    setAdditionalInstructors([...additionalInstructors, newAdditional]);
  };

  const handleRemoveAdditionalInstructor = async (index) => {
    const updated = additionalInstructors.filter((_, i) => i !== index);
    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        additionalInstructors: updated.filter(a => a.instructor), // Only save ones with instructor set
        updatedBy: user?.username
      });
      setAdditionalInstructors(updated);
      loadLessonDetails();
      onUpdated();
    } catch (error) {
      alert('Ek eğitmen silinirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAdditionalInstructorChange = async (index, instructorId) => {
    const updated = [...additionalInstructors];
    updated[index] = {
      ...updated[index],
      instructor: instructorId
    };

    // Only save if instructor is selected
    if (instructorId) {
      try {
        await api.put(`/scheduled-lessons/${lesson._id}`, {
          additionalInstructors: updated.filter(a => a.instructor),
          updatedBy: user?.username
        });
        loadLessonDetails();
        onUpdated();
      } catch (error) {
        alert('Ek eğitmen güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
      }
    }
    setAdditionalInstructors(updated);
  };

  const handleAdditionalInstructorConfirmation = async (index, confirmed) => {
    const updated = [...additionalInstructors];
    updated[index] = {
      ...updated[index],
      confirmed: confirmed
    };

    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        additionalInstructors: updated.filter(a => a.instructor),
        updatedBy: user?.username
      });
      setAdditionalInstructors(updated);
      onUpdated();
    } catch (error) {
      alert('Ek eğitmen onayı güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get available instructors (exclude already selected ones)
  const getAvailableInstructors = (currentIndex = -1) => {
    const selectedIds = [selectedInstructor];
    additionalInstructors.forEach((ai, idx) => {
      if (idx !== currentIndex && ai.instructor) {
        const instructorId = typeof ai.instructor === 'object' ? ai.instructor._id : ai.instructor;
        selectedIds.push(instructorId);
      }
    });
    return instructors.filter(i => !selectedIds.includes(i._id));
  };

  const handleCompleteLesson = async (completionData) => {
    try {
      // Prepare additional instructors data with payments
      const updatedAdditionalInstructors = (completionData.additionalInstructorPayments || []).map((payment, index) => ({
        instructor: additionalInstructors[index]?.instructor?._id || additionalInstructors[index]?.instructor,
        confirmed: additionalInstructors[index]?.confirmed || false,
        paymentCalculated: true,
        paymentAmount: payment,
        paymentPaid: false
      })).filter(ai => ai.instructor);

      // Update lesson status and actual duration
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        status: 'completed',
        actualDuration: completionData.actualDuration,
        instructorPaymentCalculated: true,
        instructorPaymentAmount: completionData.paymentAmount,
        additionalInstructors: updatedAdditionalInstructors,
        updatedBy: user?.username
      });

      // Update primary instructor balance (add unpaid debt)
      const currentInstructor = instructors.find(i => i._id === selectedInstructor);
      if (currentInstructor) {
        await api.put(`/instructors/${selectedInstructor}`, {
          balance: (currentInstructor.balance || 0) + completionData.paymentAmount,
          updatedBy: user?.username
        });
      }

      // Update additional instructors' balances
      let totalAdditionalPayment = 0;
      for (let i = 0; i < (completionData.additionalInstructorPayments || []).length; i++) {
        const payment = completionData.additionalInstructorPayments[i];
        if (payment > 0 && additionalInstructors[i]?.instructor) {
          const instructorId = additionalInstructors[i].instructor._id || additionalInstructors[i].instructor;
          const instructor = instructors.find(inst => inst._id === instructorId);
          if (instructor) {
            await api.put(`/instructors/${instructorId}`, {
              balance: (instructor.balance || 0) + payment,
              updatedBy: user?.username
            });
            totalAdditionalPayment += payment;
          }
        }
      }

      // NOTE: Expense record will be created when payment is made from InstructorDetail page
      // This keeps lessons as unpaid until manually paid

      setStatus('completed');
      const totalPayment = completionData.paymentAmount + totalAdditionalPayment;
      const additionalInfo = totalAdditionalPayment > 0
        ? `\n(Ana eğitmen: ₺${completionData.paymentAmount.toFixed(2)}, Ek eğitmenler: ₺${totalAdditionalPayment.toFixed(2)})`
        : '';
      alert(`Ders tamamlandı! Toplam ₺${totalPayment.toFixed(2)} borç olarak kaydedildi.${additionalInfo}\nÖdeme yapmak için eğitmen detay sayfasına gidin.`);
      loadLessonDetails();
      onUpdated();
    } catch (error) {
      alert('Ders tamamlanırken hata oluştu: ' + (error.response?.data?.message || error.message));
      throw error;
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
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Ana Eğitmen
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={selectedInstructor}
                        onChange={(e) => handleInstructorChange(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Eğitmen Seçilmedi</em>
                        </MenuItem>
                        {instructors.map((instructor) => (
                          <MenuItem key={instructor._id} value={instructor._id}>
                            {instructor.firstName} {instructor.lastName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      sx={{ mt: 1 }}
                      control={
                        <Checkbox
                          checked={instructorConfirmed}
                          onChange={(e) => handleInstructorConfirmation(e.target.checked)}
                          disabled={!selectedInstructor}
                        />
                      }
                      label="Ana eğitmen derse girdi (onaylandı)"
                    />
                    {!instructorConfirmed && selectedInstructor && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Dersi tamamlamak için ana eğitmen onayı gereklidir
                      </Alert>
                    )}
                  </Grid>

                  {/* Additional Instructors Section */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ek Eğitmenler (Opsiyonel)
                      </Typography>
                      {additionalInstructors.length < 2 && (
                        <Button
                          size="small"
                          startIcon={<PersonAdd />}
                          onClick={handleAddAdditionalInstructor}
                          disabled={!selectedInstructor}
                        >
                          Ek Eğitmen Ekle
                        </Button>
                      )}
                    </Box>

                    {additionalInstructors.map((ai, index) => {
                      const instructorId = ai.instructor?._id || ai.instructor;
                      return (
                        <Box key={index} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                              {index + 2}. Eğitmen
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveAdditionalInstructor(index)}
                            >
                              <RemoveCircle fontSize="small" />
                            </IconButton>
                          </Box>
                          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                            <Select
                              value={instructorId || ''}
                              onChange={(e) => handleAdditionalInstructorChange(index, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Eğitmen Seçin</em>
                              </MenuItem>
                              {getAvailableInstructors(index).map((instructor) => (
                                <MenuItem key={instructor._id} value={instructor._id}>
                                  {instructor.firstName} {instructor.lastName}
                                </MenuItem>
                              ))}
                              {/* Also show current selection if any */}
                              {instructorId && !getAvailableInstructors(index).find(i => i._id === instructorId) && (
                                <MenuItem value={instructorId}>
                                  {ai.instructor?.firstName} {ai.instructor?.lastName}
                                </MenuItem>
                              )}
                            </Select>
                          </FormControl>
                          {instructorId && (
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={ai.confirmed || false}
                                  onChange={(e) => handleAdditionalInstructorConfirmation(index, e.target.checked)}
                                  size="small"
                                />
                              }
                              label="Bu eğitmen derse girdi"
                            />
                          )}
                        </Box>
                      );
                    })}

                    {additionalInstructors.length === 0 && selectedInstructor && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 1 }}>
                        Bu derse ek eğitmen atanmadı. Gerekirse yukarıdaki butona tıklayarak ekleyebilirsiniz.
                      </Typography>
                    )}
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
          onClick={() => setEditLessonOpen(true)}
        >
          Düzenle
        </Button>
      </DialogActions>

      {/* Complete Lesson Dialog */}
      <CompleteLessonDialog
        open={completeLessonOpen}
        onClose={() => setCompleteLessonOpen(false)}
        lesson={lessonData}
        instructor={instructors.find(i => i._id === selectedInstructor)}
        additionalInstructors={additionalInstructors.filter(ai => ai.instructor && ai.confirmed).map(ai => {
          const instructorId = ai.instructor?._id || ai.instructor;
          return instructors.find(i => i._id === instructorId);
        }).filter(Boolean)}
        onComplete={handleCompleteLesson}
      />

      {/* Edit Lesson Dialog */}
      <EditLessonDialog
        open={editLessonOpen}
        onClose={() => setEditLessonOpen(false)}
        lesson={lessonData}
        onSuccess={() => {
          loadLessonDetails();
          onUpdated();
        }}
      />
    </Dialog>
  );
};

export default LessonDetailDialog;
