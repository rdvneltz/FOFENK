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
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  LinearProgress,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Close,
  Edit,
  Delete,
  Save,
  CheckCircle,
  Cancel,
  Schedule,
  PersonAdd,
  RemoveCircle,
  AccessTime,
  Group,
  Payment,
  ExpandMore,
  ExpandLess,
  Warning,
  Done,
  HourglassEmpty,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';
import LoadingSpinner from '../Common/LoadingSpinner';
import EditLessonDialog from './EditLessonDialog';

const LessonDetailDialog = ({ open, onClose, lesson, onUpdated, onDeleted }) => {
  const { user, institution, season } = useApp();
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [instructorConfirmed, setInstructorConfirmed] = useState(false);
  const [additionalInstructors, setAdditionalInstructors] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [status, setStatus] = useState('scheduled');
  const [saving, setSaving] = useState(false);
  const [editLessonOpen, setEditLessonOpen] = useState(false);

  // Completion form state
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [actualDuration, setActualDuration] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [additionalPayments, setAdditionalPayments] = useState([]);
  const [completionError, setCompletionError] = useState('');
  const [completing, setCompleting] = useState(false);

  // Payment edit state (for completed lessons)
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editAdditionalPayments, setEditAdditionalPayments] = useState([]);
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentEditError, setPaymentEditError] = useState('');

  // Revert completion state
  const [reverting, setReverting] = useState(false);

  // Expanded sections
  const [attendanceExpanded, setAttendanceExpanded] = useState(true);

  // Postpone dialog state
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [postponeData, setPostponeData] = useState({
    newDate: '',
    newStartTime: '',
    newEndTime: '',
    reason: '',
  });
  const [postponing, setPostponing] = useState(false);

  useEffect(() => {
    if (open && lesson) {
      loadLessonDetails();
      setShowCompletionForm(false);
      setCompletionError('');
      setShowPaymentEdit(false);
      setPaymentEditError('');
    }
  }, [open, lesson]);

  const loadLessonDetails = async () => {
    try {
      setLoading(true);

      const lessonRes = await api.get(`/scheduled-lessons/${lesson._id}`);
      setLessonData(lessonRes.data);
      setStatus(lessonRes.data.status);
      setSelectedInstructor(lessonRes.data.instructor?._id || '');
      setInstructorConfirmed(lessonRes.data.instructorConfirmed || false);
      setAdditionalInstructors(lessonRes.data.additionalInstructors || []);

      // For birebir (one-on-one) lessons: only show the specific student assigned to this lesson
      // For group lessons: show all enrolled students in the course
      if (lessonRes.data.student && lessonRes.data.student._id) {
        // Birebir lesson - find or create enrollment data for just this student
        const enrollmentsRes = await api.get('/enrollments', {
          params: {
            courseId: lesson.course._id,
            studentId: lessonRes.data.student._id,
            isActive: true
          }
        });

        // If enrollment found, use it; otherwise create a mock enrollment object for display
        if (enrollmentsRes.data.length > 0) {
          setEnrolledStudents(enrollmentsRes.data);
        } else {
          // Student might not have formal enrollment, use lesson's student data
          setEnrolledStudents([{
            _id: 'birebir-' + lessonRes.data.student._id,
            student: lessonRes.data.student,
            course: lesson.course,
            isActive: true
          }]);
        }
      } else {
        // Group lesson - show all enrolled students
        const enrollmentsRes = await api.get('/enrollments', {
          params: {
            courseId: lesson.course._id,
            isActive: true
          }
        });
        setEnrolledStudents(enrollmentsRes.data);
      }

      const instructorsRes = await api.get('/instructors', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      setInstructors(instructorsRes.data);

      const attendanceRes = await api.get('/attendance', {
        params: {
          scheduledLessonId: lesson._id
        }
      });

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

  // Calculate planned duration
  const calculatePlannedDuration = () => {
    if (!lessonData) return 0;
    const [startHour, startMin] = lessonData.startTime.split(':').map(Number);
    const [endHour, endMin] = lessonData.endTime.split(':').map(Number);
    return (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
  };

  // Calculate payment based on instructor settings
  const calculatePayment = (instructor, hours) => {
    if (!instructor || !instructor.paymentType) return 0;
    const attendingCount = Object.values(attendance).filter(a => a).length;

    switch (instructor.paymentType) {
      case 'hourly':
        return hours * (instructor.paymentAmount || 0);
      case 'perLesson':
        return instructor.paymentAmount || 0;
      case 'perStudent':
        return attendingCount * (instructor.paymentAmount || 0);
      default:
        return 0;
    }
  };

  // Initialize completion form
  const initCompletionForm = () => {
    const planned = calculatePlannedDuration();
    setActualDuration(planned.toString());

    const primaryInstructor = instructors.find(i => i._id === selectedInstructor);
    if (primaryInstructor) {
      setPaymentAmount(calculatePayment(primaryInstructor, planned).toString());
    }

    // Calculate for additional instructors
    const confirmedAdditional = additionalInstructors.filter(ai => ai.instructor && ai.confirmed);
    const additionalDefaults = confirmedAdditional.map(ai => {
      const inst = instructors.find(i => i._id === (ai.instructor._id || ai.instructor));
      return inst ? calculatePayment(inst, planned).toString() : '0';
    });
    setAdditionalPayments(additionalDefaults);
  };

  // Handle duration change - recalculate payments
  const handleDurationChange = (value) => {
    setActualDuration(value);
    const hours = parseFloat(value) || 0;

    const primaryInstructor = instructors.find(i => i._id === selectedInstructor);
    if (primaryInstructor) {
      setPaymentAmount(calculatePayment(primaryInstructor, hours).toString());
    }

    const confirmedAdditional = additionalInstructors.filter(ai => ai.instructor && ai.confirmed);
    const newAdditionalPayments = confirmedAdditional.map(ai => {
      const inst = instructors.find(i => i._id === (ai.instructor._id || ai.instructor));
      return inst ? calculatePayment(inst, hours).toString() : '0';
    });
    setAdditionalPayments(newAdditionalPayments);
  };

  const handleInstructorChange = async (newInstructorId) => {
    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        instructor: newInstructorId || null,
        updatedBy: user?.username
      });
      setSelectedInstructor(newInstructorId);
      loadLessonDetails();
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

  const handleAddAdditionalInstructor = async () => {
    if (additionalInstructors.length >= 2) {
      alert('En fazla 2 ek eğitmen ekleyebilirsiniz!');
      return;
    }
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
        additionalInstructors: updated.filter(a => a.instructor),
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
    updated[index] = { ...updated[index], instructor: instructorId };

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
    updated[index] = { ...updated[index], confirmed };

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

  const handleAttendanceChange = (studentId, attended) => {
    setAttendance({ ...attendance, [studentId]: attended });
  };

  // Select all students
  const handleSelectAll = () => {
    const allAttended = {};
    enrolledStudents.forEach(enrollment => {
      allAttended[enrollment.student._id] = true;
    });
    setAttendance(allAttended);
  };

  // Deselect all students
  const handleDeselectAll = () => {
    setAttendance({});
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);

      const promises = enrolledStudents.map(async (enrollment) => {
        const studentId = enrollment.student._id;
        const attended = attendance[studentId] || false;

        const existingAttendance = await api.get('/attendance', {
          params: {
            scheduledLessonId: lesson._id,
            studentId: studentId
          }
        });

        if (existingAttendance.data.length > 0) {
          await api.put(`/attendance/${existingAttendance.data[0]._id}`, {
            attended,
            updatedBy: user?.username
          });
        } else {
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

  // Start completion process
  const handleStartCompletion = () => {
    if (!selectedInstructor) {
      alert('Dersi tamamlamak için bir eğitmen seçmelisiniz!');
      return;
    }
    if (!instructorConfirmed) {
      alert('Dersi tamamlamak için ana eğitmenin derse girdiğini onaylamalısınız!');
      return;
    }

    initCompletionForm();
    setShowCompletionForm(true);
  };

  // Complete the lesson
  const handleCompleteLesson = async () => {
    const duration = parseFloat(actualDuration);
    const payment = parseFloat(paymentAmount);

    if (!actualDuration || isNaN(duration) || duration <= 0) {
      setCompletionError('Lütfen geçerli bir ders süresi girin');
      return;
    }

    if (paymentAmount === '' || paymentAmount === null || paymentAmount === undefined || isNaN(payment) || payment < 0) {
      setCompletionError('Lütfen geçerli bir ödeme tutarı girin');
      return;
    }

    setCompleting(true);
    setCompletionError('');

    try {
      // First save attendance automatically
      const attendancePromises = enrolledStudents.map(async (enrollment) => {
        const studentId = enrollment.student._id;
        const attended = attendance[studentId] || false;

        const existingAttendance = await api.get('/attendance', {
          params: {
            scheduledLessonId: lesson._id,
            studentId: studentId
          }
        });

        if (existingAttendance.data.length > 0) {
          await api.put(`/attendance/${existingAttendance.data[0]._id}`, {
            attended,
            updatedBy: user?.username
          });
        } else {
          await api.post('/attendance', {
            scheduledLesson: lesson._id,
            student: studentId,
            attended,
            createdBy: user?.username
          });
        }
      });
      await Promise.all(attendancePromises);

      // Prepare additional instructors data
      const confirmedAdditional = additionalInstructors.filter(ai => ai.instructor && ai.confirmed);
      const updatedAdditionalInstructors = confirmedAdditional.map((ai, index) => ({
        instructor: ai.instructor?._id || ai.instructor,
        confirmed: ai.confirmed,
        paymentCalculated: true,
        paymentAmount: parseFloat(additionalPayments[index]) || 0,
        paymentPaid: false
      }));

      // Update lesson
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        status: 'completed',
        actualDuration: duration,
        instructorPaymentCalculated: true,
        instructorPaymentAmount: payment,
        additionalInstructors: updatedAdditionalInstructors,
        updatedBy: user?.username
      });

      // Update primary instructor balance
      const currentInstructor = instructors.find(i => i._id === selectedInstructor);
      if (currentInstructor) {
        await api.put(`/instructors/${selectedInstructor}`, {
          balance: (currentInstructor.balance || 0) + payment,
          updatedBy: user?.username
        });
      }

      // Update additional instructors' balances
      let totalAdditionalPayment = 0;
      for (let i = 0; i < confirmedAdditional.length; i++) {
        const paymentValue = parseFloat(additionalPayments[i]) || 0;
        if (paymentValue > 0) {
          const instructorId = confirmedAdditional[i].instructor._id || confirmedAdditional[i].instructor;
          const instructor = instructors.find(inst => inst._id === instructorId);
          if (instructor) {
            await api.put(`/instructors/${instructorId}`, {
              balance: (instructor.balance || 0) + paymentValue,
              updatedBy: user?.username
            });
            totalAdditionalPayment += paymentValue;
          }
        }
      }

      setStatus('completed');
      const totalPayment = payment + totalAdditionalPayment;

      alert(`✅ Ders tamamlandı!\n\n📋 Yoklama kaydedildi: ${Object.values(attendance).filter(a => a).length}/${enrolledStudents.length} katılım\n💰 Toplam ₺${totalPayment.toLocaleString('tr-TR')} borç olarak kaydedildi.\n\nÖdeme yapmak için eğitmen detay sayfasına gidin.`);

      setShowCompletionForm(false);
      loadLessonDetails();
      onUpdated();
    } catch (error) {
      setCompletionError('Ders tamamlanırken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setCompleting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'completed') {
      handleStartCompletion();
      return;
    }

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

  // Start editing payment for completed lesson
  const handleStartPaymentEdit = () => {
    setEditPaymentAmount(lessonData.instructorPaymentAmount?.toString() || '0');
    setEditDuration(lessonData.actualDuration?.toString() || '');
    // Initialize additional instructors payment amounts
    const additionalPaymentAmounts = (lessonData.additionalInstructors || [])
      .filter(ai => ai.instructor && ai.confirmed)
      .map(ai => ai.paymentAmount?.toString() || '0');
    setEditAdditionalPayments(additionalPaymentAmounts);
    setPaymentEditError('');
    setShowPaymentEdit(true);
  };

  // Save edited payment
  const handleSavePaymentEdit = async () => {
    const newPayment = parseFloat(editPaymentAmount);
    const newDuration = parseFloat(editDuration);

    if (isNaN(newPayment) || newPayment < 0) {
      setPaymentEditError('Lütfen ana eğitmen için geçerli bir ödeme tutarı girin');
      return;
    }

    if (editDuration && (isNaN(newDuration) || newDuration <= 0)) {
      setPaymentEditError('Lütfen geçerli bir süre girin');
      return;
    }

    // Validate additional instructor payments
    for (let i = 0; i < editAdditionalPayments.length; i++) {
      const additionalPayment = parseFloat(editAdditionalPayments[i]);
      if (isNaN(additionalPayment) || additionalPayment < 0) {
        setPaymentEditError(`Lütfen ${i + 2}. eğitmen için geçerli bir ödeme tutarı girin`);
        return;
      }
    }

    setEditingPayment(true);
    setPaymentEditError('');

    try {
      const oldPayment = lessonData.instructorPaymentAmount || 0;
      const paymentDifference = newPayment - oldPayment;

      // Prepare updated additional instructors data
      const confirmedAdditional = (lessonData.additionalInstructors || []).filter(ai => ai.instructor && ai.confirmed);
      const updatedAdditionalInstructors = confirmedAdditional.map((ai, index) => {
        const newAdditionalPayment = parseFloat(editAdditionalPayments[index]) || 0;
        return {
          ...ai,
          instructor: ai.instructor._id || ai.instructor,
          paymentAmount: newAdditionalPayment,
          paymentCalculated: true
        };
      });

      // Update the lesson with new payment amounts
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        instructorPaymentAmount: newPayment,
        actualDuration: newDuration || lessonData.actualDuration,
        additionalInstructors: updatedAdditionalInstructors,
        updatedBy: user?.username
      });

      // Adjust primary instructor balance by the difference
      if (paymentDifference !== 0 && lessonData.instructor?._id) {
        const instructor = instructors.find(i => i._id === lessonData.instructor._id);
        if (instructor) {
          await api.put(`/instructors/${lessonData.instructor._id}`, {
            balance: (instructor.balance || 0) + paymentDifference,
            updatedBy: user?.username
          });
        }
      }

      // Adjust additional instructors' balances
      let additionalChanges = [];
      for (let i = 0; i < confirmedAdditional.length; i++) {
        const oldAdditionalPayment = confirmedAdditional[i].paymentAmount || 0;
        const newAdditionalPayment = parseFloat(editAdditionalPayments[i]) || 0;
        const additionalDifference = newAdditionalPayment - oldAdditionalPayment;

        if (additionalDifference !== 0) {
          const instructorId = confirmedAdditional[i].instructor._id || confirmedAdditional[i].instructor;
          const instructor = instructors.find(inst => inst._id === instructorId);
          if (instructor) {
            await api.put(`/instructors/${instructorId}`, {
              balance: (instructor.balance || 0) + additionalDifference,
              updatedBy: user?.username
            });
            additionalChanges.push(`${instructor.firstName} ${instructor.lastName}: ${additionalDifference >= 0 ? '+' : ''}₺${additionalDifference.toLocaleString('tr-TR')}`);
          }
        }
      }

      let alertMessage = `✅ Ödeme güncellendi!\n\nAna Eğitmen:\nEski: ₺${oldPayment.toLocaleString('tr-TR')}\nYeni: ₺${newPayment.toLocaleString('tr-TR')}\nFark: ${paymentDifference >= 0 ? '+' : ''}₺${paymentDifference.toLocaleString('tr-TR')}`;

      if (additionalChanges.length > 0) {
        alertMessage += `\n\nEk Eğitmenler:\n${additionalChanges.join('\n')}`;
      }

      alert(alertMessage);

      setShowPaymentEdit(false);
      loadLessonDetails();
      onUpdated();
    } catch (error) {
      setPaymentEditError('Ödeme güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setEditingPayment(false);
    }
  };

  // Revert lesson completion back to scheduled
  const handleRevertCompletion = async () => {
    if (!window.confirm(
      'Bu dersin tamamlanma durumunu geri almak istediğinizden emin misiniz?\n\n' +
      '• Ders durumu "Planlandı" olarak değişecek\n' +
      '• Eğitmen bakiyesinden bu ders için eklenen tutar düşülecek\n' +
      '• Ödeme bilgileri sıfırlanacak'
    )) {
      return;
    }

    setReverting(true);

    try {
      // Update lesson status back to scheduled and clear payment info
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        status: 'scheduled',
        instructorPaymentCalculated: false,
        instructorPaymentAmount: null,
        instructorPaymentPaid: false,
        actualDuration: null,
        // Also reset additional instructors payment info
        additionalInstructors: (lessonData.additionalInstructors || []).map(ai => ({
          ...ai,
          paymentCalculated: false,
          paymentAmount: 0,
          paymentPaid: false
        })),
        updatedBy: user?.username
      });

      // Note: Instructor balance is calculated dynamically from unpaid lessons,
      // so we don't need to manually adjust it. When the lesson status changes
      // from 'completed' to 'scheduled', it will no longer be included in the
      // unpaid lessons calculation.

      setStatus('scheduled');
      alert('✅ Ders durumu geri alındı!\n\nDers artık "Planlandı" durumunda.');

      loadLessonDetails();
      onUpdated();
    } catch (error) {
      alert('Ders durumu geri alınırken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setReverting(false);
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

  // Postpone handlers
  const handleOpenPostponeDialog = () => {
    setPostponeData({
      newDate: '',
      newStartTime: lessonData?.startTime || '',
      newEndTime: lessonData?.endTime || '',
      reason: '',
    });
    setPostponeDialogOpen(true);
  };

  const handleClosePostponeDialog = () => {
    setPostponeDialogOpen(false);
  };

  const handlePostpone = async () => {
    if (!postponeData.newDate) {
      alert('Lütfen yeni tarih girin');
      return;
    }
    if (!postponeData.newStartTime || !postponeData.newEndTime) {
      alert('Lütfen yeni başlangıç ve bitiş saati girin');
      return;
    }

    setPostponing(true);

    try {
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        // Store original values
        originalDate: lessonData.date,
        originalStartTime: lessonData.startTime,
        originalEndTime: lessonData.endTime,
        // Set new values
        date: postponeData.newDate,
        startTime: postponeData.newStartTime,
        endTime: postponeData.newEndTime,
        postponeReason: postponeData.reason,
        status: 'scheduled', // Reset to scheduled so it can be completed at new time
        updatedBy: user?.username,
      });

      setPostponeDialogOpen(false);
      setStatus('scheduled');
      alert('Ders ertelendi! Yeni tarih: ' + new Date(postponeData.newDate).toLocaleDateString('tr-TR') + ' ' + postponeData.newStartTime);
      loadLessonDetails();
      onUpdated();
    } catch (error) {
      alert('Erteleme hatası: ' + (error.response?.data?.message || error.message));
    } finally {
      setPostponing(false);
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

  const getStatusColor = (s) => {
    switch (s) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'postponed': return 'warning';
      default: return 'info';
    }
  };

  const getStatusLabel = (s) => {
    switch (s) {
      case 'scheduled': return 'Planlandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'postponed': return 'Ertelendi';
      default: return s;
    }
  };

  const getPaymentTypeLabel = (type) => {
    switch (type) {
      case 'perLesson': return 'Ders Başı';
      case 'hourly': return 'Saat Başı';
      case 'perStudent': return 'Öğrenci Başı';
      case 'monthly': return 'Aylık';
      default: return type;
    }
  };

  const attendingCount = Object.values(attendance).filter(a => a).length;
  const plannedDuration = calculatePlannedDuration();
  const primaryInstructor = instructors.find(i => i._id === selectedInstructor);
  const confirmedAdditionalCount = additionalInstructors.filter(ai => ai.instructor && ai.confirmed).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {lessonData.course?.name || 'Ders'}
            </Typography>
            {/* Show student name for birebir (one-on-one) lessons */}
            {lessonData.student && (
              <Chip
                icon={<Group />}
                label={`Birebir: ${lessonData.student.firstName} ${lessonData.student.lastName}`}
                size="small"
                color="secondary"
                sx={{ mt: 0.5, mb: 0.5 }}
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={getStatusLabel(status)}
                color={getStatusColor(status)}
                size="small"
                icon={status === 'completed' ? <Done /> : status === 'scheduled' ? <HourglassEmpty /> : undefined}
              />
              <Typography variant="body2" color="text.secondary">
                {new Date(lessonData.date).toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Typography>
              <Chip
                icon={<AccessTime />}
                label={`${lessonData.startTime} - ${lessonData.endTime}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Completion Form - Shown when completing */}
        {showCompletionForm ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Dersi tamamlamadan önce aşağıdaki bilgileri kontrol edin ve onaylayın.
            </Alert>

            {completionError && (
              <Alert severity="error" sx={{ mb: 2 }}>{completionError}</Alert>
            )}

            <Grid container spacing={3}>
              {/* Duration */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    Ders Süresi
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Planlanan</Typography>
                      <Typography variant="h6">{plannedDuration} saat</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Gerçek Süre (Saat)"
                        value={actualDuration}
                        onChange={(e) => handleDurationChange(e.target.value)}
                        inputProps={{ step: 0.5, min: 0.5, max: 24 }}
                        size="small"
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Attendance Summary */}
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    <Group sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                    Yoklama Özeti
                  </Typography>
                  <Typography variant="h4" color={attendingCount > 0 ? 'success.main' : 'error.main'}>
                    {attendingCount}/{enrolledStudents.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">öğrenci katıldı</Typography>
                </Paper>
              </Grid>

              {/* Primary Instructor Payment */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, border: '2px solid', borderColor: 'primary.main' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                      Ana Eğitmen: {primaryInstructor?.firstName} {primaryInstructor?.lastName}
                    </Typography>
                    <Chip
                      label={getPaymentTypeLabel(primaryInstructor?.paymentType)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        {primaryInstructor?.paymentType === 'hourly' && `Saatlik: ₺${primaryInstructor?.paymentAmount?.toLocaleString('tr-TR')}`}
                        {primaryInstructor?.paymentType === 'perLesson' && `Ders Başı: ₺${primaryInstructor?.paymentAmount?.toLocaleString('tr-TR')}`}
                        {primaryInstructor?.paymentType === 'perStudent' && `Öğrenci Başı: ₺${primaryInstructor?.paymentAmount?.toLocaleString('tr-TR')} × ${attendingCount} öğrenci`}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Ödenecek Tutar (₺)"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        inputProps={{ step: 0.01, min: 0 }}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Additional Instructors Payment */}
              {additionalInstructors.filter(ai => ai.instructor && ai.confirmed).map((ai, index) => {
                const inst = instructors.find(i => i._id === (ai.instructor._id || ai.instructor));
                return (
                  <Grid item xs={12} key={index}>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" color="secondary">
                          {index + 2}. Eğitmen: {inst?.firstName} {inst?.lastName}
                        </Typography>
                        <Chip label={getPaymentTypeLabel(inst?.paymentType)} size="small" variant="outlined" />
                      </Box>
                      <TextField
                        fullWidth
                        type="number"
                        label="Ödenecek Tutar (₺)"
                        value={additionalPayments[index] || ''}
                        onChange={(e) => {
                          const newPayments = [...additionalPayments];
                          newPayments[index] = e.target.value;
                          setAdditionalPayments(newPayments);
                        }}
                        inputProps={{ step: 0.01, min: 0 }}
                        size="small"
                      />
                    </Paper>
                  </Grid>
                );
              })}

              {/* Total Payment */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      <Payment sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} />
                      Toplam Ödeme
                    </Typography>
                    <Typography variant="h5" color="success.dark" fontWeight="bold">
                      ₺{((parseFloat(paymentAmount) || 0) + additionalPayments.reduce((sum, p) => sum + (parseFloat(p) || 0), 0)).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Bu tutar eğitmenlerin bakiyelerine borç olarak eklenecektir.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button variant="outlined" onClick={() => setShowCompletionForm(false)} disabled={completing}>
                Geri
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleCompleteLesson}
                disabled={completing}
                sx={{ flex: 1 }}
              >
                {completing ? 'Tamamlanıyor...' : 'Dersi Tamamla'}
              </Button>
            </Box>
          </Box>
        ) : (
          /* Main View */
          <Grid container spacing={2}>
            {/* Instructor Section */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent sx={{ pb: '16px !important' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    EĞİTMENLER
                  </Typography>

                  {/* Primary Instructor */}
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Ana Eğitmen</InputLabel>
                          <Select
                            value={selectedInstructor}
                            onChange={(e) => handleInstructorChange(e.target.value)}
                            label="Ana Eğitmen"
                          >
                            <MenuItem value=""><em>Seçilmedi</em></MenuItem>
                            {instructors.map((instructor) => (
                              <MenuItem key={instructor._id} value={instructor._id}>
                                {instructor.firstName} {instructor.lastName}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={instructorConfirmed}
                              onChange={(e) => handleInstructorConfirmation(e.target.checked)}
                              disabled={!selectedInstructor}
                              color="success"
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2">Derse girdi</Typography>
                              {instructorConfirmed && <CheckCircle color="success" sx={{ fontSize: 16 }} />}
                            </Box>
                          }
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Additional Instructors */}
                  {additionalInstructors.map((ai, index) => {
                    const instructorId = ai.instructor?._id || ai.instructor;
                    return (
                      <Box key={index} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" color="secondary">
                            {index + 2}. Eğitmen
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <IconButton size="small" color="error" onClick={() => handleRemoveAdditionalInstructor(index)}>
                            <RemoveCircle fontSize="small" />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <Select
                                value={instructorId || ''}
                                onChange={(e) => handleAdditionalInstructorChange(index, e.target.value)}
                                displayEmpty
                              >
                                <MenuItem value=""><em>Eğitmen Seçin</em></MenuItem>
                                {getAvailableInstructors(index).map((instructor) => (
                                  <MenuItem key={instructor._id} value={instructor._id}>
                                    {instructor.firstName} {instructor.lastName}
                                  </MenuItem>
                                ))}
                                {instructorId && !getAvailableInstructors(index).find(i => i._id === instructorId) && (
                                  <MenuItem value={instructorId}>
                                    {ai.instructor?.firstName} {ai.instructor?.lastName}
                                  </MenuItem>
                                )}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            {instructorId && (
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={ai.confirmed || false}
                                    onChange={(e) => handleAdditionalInstructorConfirmation(index, e.target.checked)}
                                    size="small"
                                    color="success"
                                  />
                                }
                                label="Derse girdi"
                              />
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}

                  {additionalInstructors.length < 2 && selectedInstructor && (
                    <Button
                      size="small"
                      startIcon={<PersonAdd />}
                      onClick={handleAddAdditionalInstructor}
                      sx={{ mt: 1 }}
                    >
                      Ek Eğitmen Ekle
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Attendance Section */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent sx={{ pb: '16px !important' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => setAttendanceExpanded(!attendanceExpanded)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        YOKLAMA
                      </Typography>
                      <Chip
                        label={`${attendingCount}/${enrolledStudents.length}`}
                        size="small"
                        color={attendingCount > 0 ? 'success' : 'default'}
                      />
                    </Box>
                    <IconButton size="small">
                      {attendanceExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>

                  <Collapse in={attendanceExpanded}>
                    {enrolledStudents.length === 0 ? (
                      <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                        Bu derse kayıtlı öğrenci bulunmuyor
                      </Typography>
                    ) : (
                      <Box sx={{ mt: 2 }}>
                        {/* Quick Actions */}
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Button size="small" variant="outlined" onClick={handleSelectAll}>
                            Tümünü Seç
                          </Button>
                          <Button size="small" variant="outlined" onClick={handleDeselectAll}>
                            Tümünü Kaldır
                          </Button>
                        </Box>

                        {/* Student List */}
                        <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1
                        }}>
                          {enrolledStudents.map((enrollment) => (
                            <Paper
                              key={enrollment._id}
                              variant="outlined"
                              sx={{
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: attendance[enrollment.student._id] ? 'success.50' : 'transparent',
                                borderColor: attendance[enrollment.student._id] ? 'success.main' : 'divider',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: attendance[enrollment.student._id] ? 'success.100' : 'grey.50' }
                              }}
                              onClick={() => handleAttendanceChange(enrollment.student._id, !attendance[enrollment.student._id])}
                            >
                              <Checkbox
                                checked={attendance[enrollment.student._id] || false}
                                onChange={(e) => handleAttendanceChange(enrollment.student._id, e.target.checked)}
                                color="success"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Typography variant="body2">
                                {enrollment.student?.firstName} {enrollment.student?.lastName}
                              </Typography>
                            </Paper>
                          ))}
                        </Box>

                        <Button
                          variant="contained"
                          startIcon={<Save />}
                          onClick={handleSaveAttendance}
                          disabled={saving}
                          sx={{ mt: 2 }}
                          fullWidth
                        >
                          {saving ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
                        </Button>
                      </Box>
                    )}
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>

            {/* Status / Completion Section */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent sx={{ pb: '16px !important' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    DERS DURUMU
                  </Typography>

                  {status === 'completed' ? (
                    showPaymentEdit ? (
                      /* Payment Edit Form */
                      <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Tamamlanmış dersin ödeme bilgilerini düzenleyebilirsiniz. Fark eğitmen bakiyesine yansıtılacaktır.
                        </Alert>

                        {paymentEditError && (
                          <Alert severity="error" sx={{ mb: 2 }}>{paymentEditError}</Alert>
                        )}

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Ders Süresi (Saat)"
                              value={editDuration}
                              onChange={(e) => setEditDuration(e.target.value)}
                              inputProps={{ step: 0.5, min: 0.5, max: 24 }}
                              size="small"
                              helperText={`Mevcut: ${lessonData.actualDuration || '-'} saat`}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Ana Eğitmen Ödemesi (₺)"
                              value={editPaymentAmount}
                              onChange={(e) => setEditPaymentAmount(e.target.value)}
                              inputProps={{ step: 0.01, min: 0 }}
                              size="small"
                              helperText={`Mevcut: ₺${lessonData.instructorPaymentAmount?.toLocaleString('tr-TR') || 0}`}
                            />
                          </Grid>

                          {/* Additional Instructors Payment Edit */}
                          {(lessonData.additionalInstructors || [])
                            .filter(ai => ai.instructor && ai.confirmed)
                            .map((ai, index) => {
                              const inst = instructors.find(i => i._id === (ai.instructor._id || ai.instructor));
                              return (
                                <Grid item xs={12} sm={6} key={index}>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    label={`${inst?.firstName || ''} ${inst?.lastName || ''} (${index + 2}. Eğitmen) Ödemesi (₺)`}
                                    value={editAdditionalPayments[index] || ''}
                                    onChange={(e) => {
                                      const newPayments = [...editAdditionalPayments];
                                      newPayments[index] = e.target.value;
                                      setEditAdditionalPayments(newPayments);
                                    }}
                                    inputProps={{ step: 0.01, min: 0 }}
                                    size="small"
                                    helperText={`Mevcut: ₺${ai.paymentAmount?.toLocaleString('tr-TR') || 0}`}
                                  />
                                </Grid>
                              );
                            })}
                        </Grid>

                        {editPaymentAmount && lessonData.instructorPaymentAmount !== undefined && (
                          <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="body2">
                              <strong>Fark:</strong>{' '}
                              <Typography
                                component="span"
                                color={(parseFloat(editPaymentAmount) - lessonData.instructorPaymentAmount) >= 0 ? 'error.main' : 'success.main'}
                                fontWeight="bold"
                              >
                                {(parseFloat(editPaymentAmount) - lessonData.instructorPaymentAmount) >= 0 ? '+' : ''}
                                ₺{(parseFloat(editPaymentAmount) - lessonData.instructorPaymentAmount).toLocaleString('tr-TR')}
                              </Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(parseFloat(editPaymentAmount) - lessonData.instructorPaymentAmount) > 0
                                ? 'Eğitmene ek borç tahakkuk edecek'
                                : (parseFloat(editPaymentAmount) - lessonData.instructorPaymentAmount) < 0
                                ? 'Eğitmen borcundan düşülecek'
                                : 'Değişiklik yok'}
                            </Typography>
                          </Paper>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <Button
                            variant="outlined"
                            onClick={() => setShowPaymentEdit(false)}
                            disabled={editingPayment}
                          >
                            İptal
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSavePaymentEdit}
                            disabled={editingPayment}
                            sx={{ flex: 1 }}
                          >
                            {editingPayment ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      /* Completed Lesson Info */
                      <Box>
                        <Alert
                          severity="success"
                          icon={<CheckCircle />}
                          action={
                            !lessonData.instructorPaymentPaid && (
                              <Button color="inherit" size="small" onClick={handleStartPaymentEdit}>
                                Düzenle
                              </Button>
                            )
                          }
                        >
                          <Typography variant="subtitle2">Bu ders tamamlandı</Typography>
                          {lessonData.instructorPaymentCalculated && (
                            <Typography variant="body2">
                              Ödeme: ₺{lessonData.instructorPaymentAmount?.toLocaleString('tr-TR')}
                              {lessonData.actualDuration && ` • Süre: ${lessonData.actualDuration} saat`}
                              {lessonData.instructorPaymentPaid && (
                                <Chip label="Ödendi" color="success" size="small" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                          )}
                        </Alert>
                        {!lessonData.instructorPaymentPaid ? (
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            startIcon={<Cancel />}
                            onClick={handleRevertCompletion}
                            disabled={reverting}
                            sx={{ mt: 2 }}
                          >
                            {reverting ? 'Geri Alınıyor...' : 'Tamamlanmayı Geri Al'}
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Ödeme yapıldığı için düzenleme yapılamaz. Değişiklik için önce ödemeyi iptal edin.
                          </Typography>
                        )}
                      </Box>
                    )
                  ) : (
                    <Box>
                      {/* Prerequisites Check */}
                      {(!selectedInstructor || !instructorConfirmed) && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Dersi tamamlamak için:
                          </Typography>
                          <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {!selectedInstructor && <li>Ana eğitmen seçilmeli</li>}
                            {selectedInstructor && !instructorConfirmed && <li>Ana eğitmenin derse girdiği onaylanmalı</li>}
                          </Box>
                        </Alert>
                      )}

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            startIcon={<CheckCircle />}
                            onClick={handleStartCompletion}
                            disabled={!selectedInstructor || !instructorConfirmed}
                          >
                            Dersi Tamamla
                          </Button>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Button
                            variant="outlined"
                            color="warning"
                            fullWidth
                            onClick={handleOpenPostponeDialog}
                          >
                            Ertele
                          </Button>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Button
                            variant="outlined"
                            color="error"
                            fullWidth
                            onClick={() => handleStatusChange('cancelled')}
                          >
                            İptal Et
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      {!showCompletionForm && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Kapat</Button>
          <Box sx={{ flex: 1 }} />
          <Button startIcon={<Delete />} color="error" onClick={handleDeleteLesson}>
            Sil
          </Button>
          <Button startIcon={<Edit />} variant="outlined" onClick={() => setEditLessonOpen(true)}>
            Düzenle
          </Button>
        </DialogActions>
      )}

      <EditLessonDialog
        open={editLessonOpen}
        onClose={() => setEditLessonOpen(false)}
        lesson={lessonData}
        onSuccess={() => {
          loadLessonDetails();
          onUpdated();
        }}
      />

      {/* Postpone Dialog */}
      <Dialog open={postponeDialogOpen} onClose={handleClosePostponeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Dersi Ertele</DialogTitle>
        <DialogContent>
          {lessonData && (
            <Box sx={{ mb: 2, mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {lessonData.course?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mevcut: {new Date(lessonData.date).toLocaleDateString('tr-TR')} - {lessonData.startTime} → {lessonData.endTime}
              </Typography>
              {lessonData.originalDate && (
                <Typography variant="body2" color="warning.main">
                  Daha önce ertelendi: {new Date(lessonData.originalDate).toLocaleDateString('tr-TR')} - {lessonData.originalStartTime}
                </Typography>
              )}
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Yeni Tarih"
                type="date"
                value={postponeData.newDate}
                onChange={(e) => setPostponeData({ ...postponeData, newDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Başlangıç Saati"
                type="time"
                value={postponeData.newStartTime}
                onChange={(e) => setPostponeData({ ...postponeData, newStartTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Bitiş Saati"
                type="time"
                value={postponeData.newEndTime}
                onChange={(e) => setPostponeData({ ...postponeData, newEndTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Erteleme Nedeni (Opsiyonel)"
                value={postponeData.reason}
                onChange={(e) => setPostponeData({ ...postponeData, reason: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePostponeDialog}>İptal</Button>
          <Button variant="contained" color="warning" onClick={handlePostpone} disabled={postponing}>
            {postponing ? 'Erteleniyor...' : 'Ertele'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default LessonDetailDialog;
