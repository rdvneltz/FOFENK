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
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Phone,
  Email,
  Add,
  Payment as PaymentIcon,
  AccountBalance,
  Delete,
  Undo,
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
    description: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });
  const [payLessonDialog, setPayLessonDialog] = useState({
    open: false,
    lesson: null,
    cashRegisterId: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });
  const [reversePaymentDialog, setReversePaymentDialog] = useState({
    open: false,
    payment: null,
    processing: false
  });
  const [salaryAccruals, setSalaryAccruals] = useState([]);
  const [salaryExpenses, setSalaryExpenses] = useState({ recurring: null, expenses: [] });
  const [accrualDialog, setAccrualDialog] = useState({
    open: false,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [salaryTemplateDialog, setSalaryTemplateDialog] = useState({
    open: false,
    dueDay: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [editPaymentDialog, setEditPaymentDialog] = useState({
    open: false,
    lesson: null,
    newPaymentAmount: '',
    newDuration: '',
    error: '',
    saving: false
  });
  const [editSalaryDialog, setEditSalaryDialog] = useState({
    open: false,
    expense: null,
    newAmount: '',
    error: '',
    saving: false
  });

  useEffect(() => {
    loadInstructor();
  }, [id]);

  const loadInstructor = async () => {
    try {
      setLoading(true);
      const [detailsRes, cashRes, lessonsRes, recurringRes] = await Promise.all([
        api.get(`/instructors/${id}/details`),
        api.get(`/cash-registers`, { params: { institution: institution._id } }),
        api.get(`/scheduled-lessons`, {
          params: {
            instructorId: id,
            institution: institution._id,
            season: season._id
          }
        }),
        api.get(`/recurring-expenses`, {
          params: {
            institution: institution._id,
            season: season._id,
            category: 'Eğitmen Ödemesi'
          }
        }),
      ]);

      setInstructor(detailsRes.data.instructor);
      setPayments(detailsRes.data.payments || []);
      setSalaryAccruals(detailsRes.data.salaryAccruals || []);
      setStatistics(detailsRes.data.statistics || {});
      // Filter out archived cash registers
      setCashRegisters((cashRes.data || []).filter(r => r.isActive !== false));

      // Use salary expenses from API response (includes recurring and overdue)
      const salaryData = detailsRes.data.salaryExpenses || { recurring: null, overdue: [] };

      // If we have a recurring expense, fetch all its expenses for the full list
      if (salaryData.recurring) {
        try {
          const expensesRes = await api.get(`/recurring-expenses/${salaryData.recurring._id}/expenses`);
          setSalaryExpenses({ recurring: salaryData.recurring, expenses: expensesRes.data || [] });
        } catch (err) {
          setSalaryExpenses({ recurring: salaryData.recurring, expenses: salaryData.overdue || [] });
        }
      } else {
        // Fallback: check recurringExpenses for this instructor
        const salaryRecurring = recurringRes.data.find(r => r.instructor?._id === id);
        if (salaryRecurring) {
          const expensesRes = await api.get(`/recurring-expenses/${salaryRecurring._id}/expenses`);
          setSalaryExpenses({ recurring: salaryRecurring, expenses: expensesRes.data || [] });
        } else {
          setSalaryExpenses({ recurring: null, expenses: [] });
        }
      }

      // Filter and sort lessons - lessons where this instructor participated
      // Check both primary instructor and additional instructors
      const confirmedLessons = lessonsRes.data
        .map(l => {
          // Primary instructor
          if (l.instructor?._id === id && l.instructorConfirmed) {
            return {
              ...l,
              isAdditionalInstructor: false,
              paymentAmountForThisInstructor: l.instructorPaymentAmount,
              paymentPaidForThisInstructor: l.instructorPaymentPaid,
              paymentCalculatedForThisInstructor: l.instructorPaymentCalculated
            };
          }
          // Additional instructor - check if confirmed
          const additionalEntry = l.additionalInstructors?.find(
            ai => ai.instructor?._id === id || ai.instructor === id
          );
          if (additionalEntry && additionalEntry.confirmed) {
            return {
              ...l,
              isAdditionalInstructor: true,
              paymentAmountForThisInstructor: additionalEntry.paymentAmount,
              paymentPaidForThisInstructor: additionalEntry.paymentPaid,
              paymentCalculatedForThisInstructor: additionalEntry.paymentCalculated
            };
          }
          return null;
        })
        .filter(l => l !== null)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setLessonHistory(confirmedLessons);

      // Separate unpaid lessons (completed but payment not made yet)
      // Include both primary instructor unpaid lessons AND additional instructor unpaid lessons
      const unpaid = [];

      lessonsRes.data.forEach(l => {
        if (l.status !== 'completed') return;

        // Check if this instructor is the primary instructor with unpaid lesson
        if (l.instructor?._id === id &&
            l.instructorConfirmed &&
            l.instructorPaymentCalculated === true &&
            l.instructorPaymentAmount > 0 &&
            !l.instructorPaymentPaid) {
          unpaid.push({
            ...l,
            isAdditionalInstructor: false,
            paymentAmountForThisInstructor: l.instructorPaymentAmount
          });
        }

        // Check if this instructor is an additional instructor with unpaid lesson
        const additionalEntry = l.additionalInstructors?.find(
          ai => (ai.instructor?._id === id || ai.instructor === id) && ai.confirmed
        );
        if (additionalEntry &&
            additionalEntry.paymentCalculated === true &&
            additionalEntry.paymentAmount > 0 &&
            !additionalEntry.paymentPaid) {
          unpaid.push({
            ...l,
            isAdditionalInstructor: true,
            additionalInstructorEntryId: additionalEntry._id,
            paymentAmountForThisInstructor: additionalEntry.paymentAmount
          });
        }
      });

      unpaid.sort((a, b) => new Date(b.date) - new Date(a.date));
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
        expenseDate: paymentDialog.expenseDate || new Date().toISOString().split('T')[0],
        cashRegister: paymentDialog.cashRegisterId,
        instructor: id,
        institution: institution._id,
        season: season._id,
        createdBy: user?.username
      });

      alert('Ödeme başarıyla kaydedildi');
      setPaymentDialog({ open: false, amount: '', cashRegisterId: cashRegisters[0]?._id || '', description: '', expenseDate: new Date().toISOString().split('T')[0] });
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

      const paymentAmount = lesson.paymentAmountForThisInstructor || lesson.instructorPaymentAmount;

      if (!lesson || !paymentAmount) {
        alert('Ödeme tutarı bulunamadı');
        return;
      }

      // Determine if this is an additional instructor payment
      const isAdditional = lesson.isAdditionalInstructor;
      const roleLabel = isAdditional ? '(Ek Eğitmen)' : '';

      // Create expense record
      await api.post('/expenses', {
        category: 'Eğitmen Ödemesi',
        amount: paymentAmount,
        description: `${lesson.course?.name || 'Ders'} - ${new Date(lesson.date).toLocaleDateString('tr-TR')} - ${instructor.firstName} ${instructor.lastName} ${roleLabel} (${lesson.actualDuration || 0} saat)`,
        expenseDate: payLessonDialog.expenseDate || new Date().toISOString().split('T')[0],
        cashRegister: cashRegisterId,
        instructor: id,
        institution: institution._id,
        season: season._id,
        createdBy: user?.username
      });

      if (isAdditional) {
        // For additional instructor: update the specific entry in additionalInstructors array
        const updatedAdditionalInstructors = lesson.additionalInstructors.map(ai => {
          const aiId = ai.instructor?._id || ai.instructor;
          if (aiId === id) {
            return {
              ...ai,
              instructor: aiId,
              paymentPaid: true,
              paymentDate: new Date()
            };
          }
          return {
            ...ai,
            instructor: ai.instructor?._id || ai.instructor
          };
        });

        await api.put(`/scheduled-lessons/${lesson._id}`, {
          additionalInstructors: updatedAdditionalInstructors,
          updatedBy: user?.username
        });
      } else {
        // For primary instructor: mark lesson as paid
        await api.put(`/scheduled-lessons/${lesson._id}`, {
          instructorPaymentPaid: true,
          instructorPaymentDate: new Date(),
          updatedBy: user?.username
        });
      }

      // Update instructor balance (subtract paid amount)
      await api.put(`/instructors/${id}`, {
        balance: instructor.balance - paymentAmount,
        updatedBy: user?.username
      });

      alert(`Ödeme başarıyla yapıldı! ₺${paymentAmount.toFixed(2)}`);
      setPayLessonDialog({ open: false, lesson: null, cashRegisterId: '', expenseDate: new Date().toISOString().split('T')[0] });
      loadInstructor(); // Reload to update balance and lesson list
    } catch (error) {
      alert('Ödeme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateAccrual = async () => {
    try {
      const { month, year } = accrualDialog;

      await api.post(`/instructors/${id}/accrue-salary`, {
        month,
        year,
        createdBy: user?.username
      });

      const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

      alert(`${monthNames[month]} ${year} maaş tahakkuku başarıyla oluşturuldu!`);
      setAccrualDialog({ ...accrualDialog, open: false });
      loadInstructor(); // Reload to update balance
    } catch (error) {
      alert('Tahakkuk hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteAccrual = async (accrualId) => {
    if (!window.confirm('Bu maaş tahakkukunu silmek istediğinize emin misiniz? Bakiye geri alınacaktır.')) {
      return;
    }

    try {
      await api.delete(`/instructors/${id}/accruals/${accrualId}`, {
        data: { deletedBy: user?.username }
      });

      alert('Tahakkuk silindi');
      loadInstructor();
    } catch (error) {
      alert('Silme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  // Reverse (undo) a payment
  const handleReversePayment = async () => {
    const { payment } = reversePaymentDialog;
    if (!payment) return;

    setReversePaymentDialog(prev => ({ ...prev, processing: true }));

    try {
      // Delete the expense (this will automatically restore the cash register balance)
      await api.delete(`/expenses/${payment._id}`, {
        data: { deletedBy: user?.username }
      });

      alert(`Ödeme geri alındı: ₺${payment.amount.toLocaleString('tr-TR')}\nKasa bakiyesi otomatik olarak güncellendi.`);
      setReversePaymentDialog({ open: false, payment: null, processing: false });
      loadInstructor();
    } catch (error) {
      setReversePaymentDialog(prev => ({ ...prev, processing: false }));
      alert('Geri alma hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  // Create salary template (recurring expense)
  const handleCreateSalaryTemplate = async () => {
    try {
      const data = {
        title: `${instructor.firstName} ${instructor.lastName} - Aylık Maaş`,
        category: 'Eğitmen Ödemesi',
        description: `${instructor.firstName} ${instructor.lastName} aylık maaş ödemesi`,
        amountType: 'fixed',
        estimatedAmount: instructor.paymentAmount || 0,
        frequency: 'monthly',
        dueDayType: 'fixed',
        dueDay: parseInt(salaryTemplateDialog.dueDay),
        startDate: salaryTemplateDialog.startDate,
        endDate: salaryTemplateDialog.endDate || undefined,
        instructor: id,
        institution: institution._id,
        season: season._id,
        isActive: true,
      };

      const response = await api.post('/recurring-expenses', data);
      const generatedCount = response.data.generatedCount || 0;
      alert(`Maaş şablonu oluşturuldu ve ${generatedCount} maaş gideri oluşturuldu!`);
      setSalaryTemplateDialog({ ...salaryTemplateDialog, open: false });
      loadInstructor();
    } catch (error) {
      alert('Şablon oluşturma hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  // Pay salary expense
  const handlePaySalaryExpense = async (expense, cashRegisterId) => {
    try {
      await api.post(`/recurring-expenses/pay/${expense._id}`, {
        amount: expense.amount,
        cashRegisterId: cashRegisterId,
        expenseDate: new Date().toISOString().split('T')[0],
      });
      alert(`Maaş ödendi: ₺${expense.amount?.toLocaleString('tr-TR')}`);
      loadInstructor();
    } catch (error) {
      alert('Ödeme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  // Open edit salary expense dialog
  const handleOpenEditSalary = (expense) => {
    setEditSalaryDialog({
      open: true,
      expense: expense,
      newAmount: expense.amount?.toString() || '',
      error: '',
      saving: false
    });
  };

  // Save edited salary expense amount
  const handleSaveEditSalary = async () => {
    const { expense, newAmount } = editSalaryDialog;
    const parsedAmount = parseFloat(newAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setEditSalaryDialog(prev => ({ ...prev, error: 'Lütfen geçerli bir tutar girin' }));
      return;
    }

    if (parsedAmount > 1000000) {
      setEditSalaryDialog(prev => ({ ...prev, error: 'Tutar çok yüksek. Lütfen kontrol edin.' }));
      return;
    }

    // No change
    if (Math.round(parsedAmount * 100) === Math.round(expense.amount * 100)) {
      setEditSalaryDialog({ open: false, expense: null, newAmount: '', error: '', saving: false });
      return;
    }

    setEditSalaryDialog(prev => ({ ...prev, saving: true, error: '' }));

    try {
      await api.patch(`/expenses/${expense._id}/amount`, {
        amount: parsedAmount,
        updatedBy: user || 'System'
      });

      setEditSalaryDialog({ open: false, expense: null, newAmount: '', error: '', saving: false });
      loadInstructor();
    } catch (error) {
      setEditSalaryDialog(prev => ({
        ...prev,
        saving: false,
        error: error.response?.data?.message || 'Tutar güncellenirken hata oluştu'
      }));
    }
  };

  // Open edit payment dialog
  const handleOpenEditPayment = (lesson) => {
    setEditPaymentDialog({
      open: true,
      lesson: lesson,
      newPaymentAmount: lesson.instructorPaymentAmount?.toString() || '0',
      newDuration: lesson.actualDuration?.toString() || '',
      error: '',
      saving: false
    });
  };

  // Save edited payment
  const handleSaveEditPayment = async () => {
    const { lesson, newPaymentAmount, newDuration } = editPaymentDialog;
    const newPayment = parseFloat(newPaymentAmount);
    const duration = parseFloat(newDuration);

    if (isNaN(newPayment) || newPayment < 0) {
      setEditPaymentDialog(prev => ({ ...prev, error: 'Lütfen geçerli bir ödeme tutarı girin' }));
      return;
    }

    if (newDuration && (isNaN(duration) || duration <= 0)) {
      setEditPaymentDialog(prev => ({ ...prev, error: 'Lütfen geçerli bir süre girin' }));
      return;
    }

    setEditPaymentDialog(prev => ({ ...prev, saving: true, error: '' }));

    try {
      const oldPayment = lesson.instructorPaymentAmount || 0;
      const paymentDifference = newPayment - oldPayment;

      // Update the lesson with new payment amount
      await api.put(`/scheduled-lessons/${lesson._id}`, {
        instructorPaymentAmount: newPayment,
        actualDuration: duration || lesson.actualDuration,
        updatedBy: user?.username
      });

      // Adjust instructor balance by the difference
      if (paymentDifference !== 0) {
        await api.put(`/instructors/${id}`, {
          balance: (instructor.balance || 0) + paymentDifference,
          updatedBy: user?.username
        });
      }

      alert(`✅ Ödeme güncellendi!\n\nEski: ₺${oldPayment.toLocaleString('tr-TR')}\nYeni: ₺${newPayment.toLocaleString('tr-TR')}\nFark: ${paymentDifference >= 0 ? '+' : ''}₺${paymentDifference.toLocaleString('tr-TR')}`);

      setEditPaymentDialog({
        open: false,
        lesson: null,
        newPaymentAmount: '',
        newDuration: '',
        error: '',
        saving: false
      });
      loadInstructor();
    } catch (error) {
      setEditPaymentDialog(prev => ({
        ...prev,
        saving: false,
        error: 'Ödeme güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message)
      }));
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
        {instructor?.paymentType === 'monthly' && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AccountBalance />}
            onClick={() => setSalaryTemplateDialog({ ...salaryTemplateDialog, open: true })}
          >
            {salaryExpenses.recurring ? 'Ek Gider Şablonu' : 'Maaş Şablonu Oluştur'}
          </Button>
        )}
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
                  primary={
                    instructor.paymentType === 'monthly' ? 'Aylık Maaş' :
                    instructor.paymentType === 'perLesson' ? 'Ders Başı Ücret' :
                    instructor.paymentType === 'hourly' ? 'Saatlik Ücret' :
                    instructor.paymentType === 'perStudent' ? 'Öğrenci Başı Ücret' : 'Ödeme Tutarı'
                  }
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
              color={statistics.balance < 0 ? 'error.main' : 'success.main'}
            >
              {statistics.balance < 0 ? '-' : ''}₺
              {Math.abs(statistics.balance || 0).toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {statistics.balance < 0
                ? (statistics.unpaidLessonsCount > 0
                    ? `Borcumuz (${statistics.unpaidLessonsCount} ödenmemiş ders)`
                    : `Borcumuz (${statistics.overdueCount || 0} gecikmiş maaş)`)
                : 'Tüm ödemeler yapıldı'}
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
              {instructor?.paymentType === 'monthly' && (
                <Tab label={`Maaş Giderleri (${salaryExpenses.expenses.filter(e => e.status !== 'paid').length})`} />
              )}
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
                            <TableCell>İşlem</TableCell>
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
                              <TableCell>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  startIcon={<Undo />}
                                  onClick={() => setReversePaymentDialog({ open: true, payment: payment, processing: false })}
                                >
                                  Geri Al
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Salary Expenses Tab - Only for monthly instructors */}
              {instructor?.paymentType === 'monthly' && tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Maaş Giderleri
                  </Typography>

                  {!salaryExpenses.recurring ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Henüz maaş şablonu oluşturulmamış.
                      </Typography>
                      <Typography variant="caption">
                        "Maaş Şablonu Oluştur" butonunu kullanarak aylık maaş giderlerini otomatik oluşturabilirsiniz.
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Add />}
                          onClick={() => setSalaryTemplateDialog({ ...salaryTemplateDialog, open: true })}
                        >
                          Maaş Şablonu Oluştur
                        </Button>
                      </Box>
                    </Alert>
                  ) : (
                    <>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">
                          Maaş Şablonu: <strong>{salaryExpenses.recurring.title}</strong>
                        </Typography>
                        <Typography variant="body2">
                          Tutar: ₺{salaryExpenses.recurring.estimatedAmount?.toLocaleString('tr-TR')} |
                          Vade: Her ayın {salaryExpenses.recurring.dueDay}. günü
                        </Typography>
                      </Alert>

                      {salaryExpenses.expenses.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ mt: 3 }}>
                          Henüz maaş gideri oluşturulmamış
                        </Typography>
                      ) : (
                        <>
                          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                            <Chip
                              label={`Bekleyen: ${salaryExpenses.expenses.filter(e => e.status !== 'paid').length}`}
                              color="warning"
                              variant="outlined"
                            />
                            <Chip
                              label={`Ödenen: ${salaryExpenses.expenses.filter(e => e.status === 'paid').length}`}
                              color="success"
                              variant="outlined"
                            />
                            <Chip
                              label={`Toplam Bekleyen: ₺${salaryExpenses.expenses.filter(e => e.status !== 'paid').reduce((sum, e) => sum + e.amount, 0).toLocaleString('tr-TR')}`}
                              color="error"
                            />
                          </Box>

                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Dönem</TableCell>
                                  <TableCell>Vade</TableCell>
                                  <TableCell>Tutar</TableCell>
                                  <TableCell>Durum</TableCell>
                                  <TableCell>İşlem</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {salaryExpenses.expenses.map((expense) => (
                                  <TableRow key={expense._id} sx={{ bgcolor: expense.status === 'overdue' ? 'error.light' : 'inherit' }}>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight="medium">
                                        {expense.description}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      {new Date(expense.dueDate).toLocaleDateString('tr-TR')}
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="body2" color="error" fontWeight="bold">
                                        ₺{expense.amount?.toLocaleString('tr-TR')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={
                                          expense.status === 'paid' ? 'Ödendi' :
                                          expense.status === 'overdue' ? 'Gecikmiş' : 'Bekliyor'
                                        }
                                        color={
                                          expense.status === 'paid' ? 'success' :
                                          expense.status === 'overdue' ? 'error' : 'warning'
                                        }
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {expense.status !== 'paid' && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Tooltip title="Tutarı Düzenle">
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() => handleOpenEditSalary(expense)}
                                            >
                                              <Edit fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <FormControl size="small" sx={{ minWidth: 120 }}>
                                            <Select
                                              displayEmpty
                                              value=""
                                              onChange={(e) => {
                                                if (e.target.value) {
                                                  handlePaySalaryExpense(expense, e.target.value);
                                                }
                                              }}
                                              renderValue={() => 'Öde'}
                                            >
                                              <MenuItem value="" disabled>Kasa Seç</MenuItem>
                                              {cashRegisters.map((reg) => (
                                                <MenuItem key={reg._id} value={reg._id}>
                                                  {reg.name}
                                                </MenuItem>
                                              ))}
                                            </Select>
                                          </FormControl>
                                        </Box>
                                      )}
                                      {expense.status === 'paid' && (
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(expense.expenseDate).toLocaleDateString('tr-TR')}
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
                    </>
                  )}
                </Box>
              )}

              {/* Unpaid Lessons Tab */}
              {tabValue === (instructor?.paymentType === 'monthly' ? 2 : 1) && (
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
                          Toplam Borç: <strong>₺{unpaidLessons.reduce((sum, l) => sum + (l.paymentAmountForThisInstructor || l.instructorPaymentAmount || 0), 0).toLocaleString('tr-TR')}</strong>
                        </Typography>
                        <Typography variant="caption">
                          {unpaidLessons.length} adet ders için ödeme bekleniyor
                          {unpaidLessons.some(l => l.isAdditionalInstructor) && ' (ek eğitmen dersleri dahil)'}
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
                            {unpaidLessons.map((lesson, index) => (
                              <TableRow key={`${lesson._id}-${lesson.isAdditionalInstructor ? 'add' : 'pri'}`}>
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
                                    {lesson.isAdditionalInstructor && (
                                      <Chip label="Ek Eğitmen" size="small" color="secondary" sx={{ ml: 1 }} />
                                    )}
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
                                    ₺{(lesson.paymentAmountForThisInstructor || lesson.instructorPaymentAmount || 0).toLocaleString('tr-TR')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                      variant="outlined"
                                      color="primary"
                                      size="small"
                                      startIcon={<Edit />}
                                      onClick={() => handleOpenEditPayment(lesson)}
                                    >
                                      Düzenle
                                    </Button>
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
                                  </Box>
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
              {tabValue === (instructor?.paymentType === 'monthly' ? 3 : 2) && (
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
                              <TableCell>İşlem</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {lessonHistory.map((lesson, index) => (
                              <TableRow key={`${lesson._id}-${lesson.isAdditionalInstructor ? 'add' : 'pri'}-${index}`}>
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
                                    {lesson.isAdditionalInstructor && (
                                      <Chip label="Ek Eğitmen" size="small" color="secondary" sx={{ ml: 1 }} />
                                    )}
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
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip
                                      label={lesson.status === 'completed' ? 'Tamamlandı' : lesson.status}
                                      color={lesson.status === 'completed' ? 'success' : 'default'}
                                      size="small"
                                    />
                                    {lesson.paymentPaidForThisInstructor && (
                                      <Chip label="Ödendi" color="info" size="small" variant="outlined" />
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  {lesson.paymentCalculatedForThisInstructor ? (
                                    <Typography variant="body2" color="success.main" fontWeight="bold">
                                      ₺{(lesson.paymentAmountForThisInstructor || 0).toLocaleString('tr-TR')}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Bekliyor
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {lesson.status === 'completed' && lesson.paymentCalculatedForThisInstructor && !lesson.paymentPaidForThisInstructor && !lesson.isAdditionalInstructor && (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      startIcon={<Edit />}
                                      onClick={() => handleOpenEditPayment(lesson)}
                                    >
                                      Düzenle
                                    </Button>
                                  )}
                                  {lesson.paymentPaidForThisInstructor && (
                                    <Typography variant="caption" color="text.secondary">
                                      Düzenlenemez
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
                  {payLessonDialog.lesson.isAdditionalInstructor && (
                    <Chip label="Ek Eğitmen" size="small" color="secondary" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <Typography variant="body2">
                  Tarih: {new Date(payLessonDialog.lesson.date).toLocaleDateString('tr-TR')}
                </Typography>
                <Typography variant="body2">
                  Süre: {payLessonDialog.lesson.actualDuration || 0} saat
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Tutar: ₺{(payLessonDialog.lesson.paymentAmountForThisInstructor || payLessonDialog.lesson.instructorPaymentAmount || 0).toLocaleString('tr-TR')}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ödeme Tarihi"
                    type="date"
                    value={payLessonDialog.expenseDate}
                    onChange={(e) => setPayLessonDialog({ ...payLessonDialog, expenseDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayLessonDialog({ open: false, lesson: null, cashRegisterId: '', expenseDate: new Date().toISOString().split('T')[0] })}>
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
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ödeme Tarihi"
                type="date"
                value={paymentDialog.expenseDate}
                onChange={(e) => setPaymentDialog({ ...paymentDialog, expenseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
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

      {/* Salary Accrual Dialog */}
      <Dialog
        open={accrualDialog.open}
        onClose={() => setAccrualDialog({ ...accrualDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Maaş Tahakkuk Et</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2">
              Aylık maaş: <strong>₺{instructor?.paymentAmount?.toLocaleString('tr-TR')}</strong>
            </Typography>
            <Typography variant="caption">
              Tahakkuk oluşturulduğunda bu tutar bakiyeye eklenecek ve kurum eğitmene borçlu görünecektir.
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Ay</InputLabel>
                <Select
                  value={accrualDialog.month}
                  onChange={(e) => setAccrualDialog({ ...accrualDialog, month: e.target.value })}
                  label="Ay"
                >
                  {[
                    { value: 1, label: 'Ocak' },
                    { value: 2, label: 'Şubat' },
                    { value: 3, label: 'Mart' },
                    { value: 4, label: 'Nisan' },
                    { value: 5, label: 'Mayıs' },
                    { value: 6, label: 'Haziran' },
                    { value: 7, label: 'Temmuz' },
                    { value: 8, label: 'Ağustos' },
                    { value: 9, label: 'Eylül' },
                    { value: 10, label: 'Ekim' },
                    { value: 11, label: 'Kasım' },
                    { value: 12, label: 'Aralık' },
                  ].map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Yıl</InputLabel>
                <Select
                  value={accrualDialog.year}
                  onChange={(e) => setAccrualDialog({ ...accrualDialog, year: e.target.value })}
                  label="Yıl"
                >
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccrualDialog({ ...accrualDialog, open: false })}>
            İptal
          </Button>
          <Button
            onClick={handleCreateAccrual}
            variant="contained"
            color="secondary"
            startIcon={<AccountBalance />}
          >
            Tahakkuk Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog
        open={editPaymentDialog.open}
        onClose={() => setEditPaymentDialog({ ...editPaymentDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ders Ödemesini Düzenle</DialogTitle>
        <DialogContent>
          {editPaymentDialog.lesson && (
            <>
              <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {editPaymentDialog.lesson.course?.name || 'Ders'}
                </Typography>
                <Typography variant="body2">
                  Tarih: {new Date(editPaymentDialog.lesson.date).toLocaleDateString('tr-TR')}
                </Typography>
                <Typography variant="body2">
                  Saat: {editPaymentDialog.lesson.startTime} - {editPaymentDialog.lesson.endTime}
                </Typography>
              </Alert>

              {editPaymentDialog.error && (
                <Alert severity="error" sx={{ mb: 2 }}>{editPaymentDialog.error}</Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ders Süresi (Saat)"
                    type="number"
                    value={editPaymentDialog.newDuration}
                    onChange={(e) => setEditPaymentDialog({ ...editPaymentDialog, newDuration: e.target.value })}
                    inputProps={{ step: 0.5, min: 0.5, max: 24 }}
                    helperText={`Mevcut: ${editPaymentDialog.lesson.actualDuration || '-'} saat`}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ödeme Tutarı (₺)"
                    type="number"
                    value={editPaymentDialog.newPaymentAmount}
                    onChange={(e) => setEditPaymentDialog({ ...editPaymentDialog, newPaymentAmount: e.target.value })}
                    inputProps={{ step: 0.01, min: 0 }}
                    helperText={`Mevcut: ₺${editPaymentDialog.lesson.instructorPaymentAmount?.toLocaleString('tr-TR') || 0}`}
                  />
                </Grid>
              </Grid>

              {editPaymentDialog.newPaymentAmount && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Fark:</strong>{' '}
                    <Typography
                      component="span"
                      color={(parseFloat(editPaymentDialog.newPaymentAmount) - (editPaymentDialog.lesson.instructorPaymentAmount || 0)) >= 0 ? 'error.main' : 'success.main'}
                      fontWeight="bold"
                    >
                      {(parseFloat(editPaymentDialog.newPaymentAmount) - (editPaymentDialog.lesson.instructorPaymentAmount || 0)) >= 0 ? '+' : ''}
                      ₺{(parseFloat(editPaymentDialog.newPaymentAmount) - (editPaymentDialog.lesson.instructorPaymentAmount || 0)).toLocaleString('tr-TR')}
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(parseFloat(editPaymentDialog.newPaymentAmount) - (editPaymentDialog.lesson.instructorPaymentAmount || 0)) > 0
                      ? 'Eğitmene ek borç tahakkuk edecek'
                      : (parseFloat(editPaymentDialog.newPaymentAmount) - (editPaymentDialog.lesson.instructorPaymentAmount || 0)) < 0
                      ? 'Eğitmen borcundan düşülecek'
                      : 'Değişiklik yok'}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditPaymentDialog({ ...editPaymentDialog, open: false })}
            disabled={editPaymentDialog.saving}
          >
            İptal
          </Button>
          <Button
            onClick={handleSaveEditPayment}
            variant="contained"
            color="primary"
            disabled={editPaymentDialog.saving}
          >
            {editPaymentDialog.saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Salary Template Dialog */}
      <Dialog
        open={salaryTemplateDialog.open}
        onClose={() => setSalaryTemplateDialog({ ...salaryTemplateDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Maaş Şablonu Oluştur</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2">
              Aylık maaş: <strong>₺{instructor?.paymentAmount?.toLocaleString('tr-TR')}</strong>
            </Typography>
            <Typography variant="caption">
              Bu şablon oluşturulduğunda, belirlenen tarih aralığındaki her ay için maaş gideri otomatik oluşturulacaktır.
              Maaş ödendiğinde eğitmen bakiyesi otomatik güncellenecektir.
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Maaş Günü (1-31)"
                type="number"
                value={salaryTemplateDialog.dueDay}
                onChange={(e) => setSalaryTemplateDialog({ ...salaryTemplateDialog, dueDay: e.target.value })}
                inputProps={{ min: 1, max: 31 }}
                helperText="Her ayın kaçıncı günü maaş vadesi olsun?"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Başlangıç Tarihi"
                type="date"
                value={salaryTemplateDialog.startDate}
                onChange={(e) => setSalaryTemplateDialog({ ...salaryTemplateDialog, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bitiş Tarihi (Opsiyonel)"
                type="date"
                value={salaryTemplateDialog.endDate}
                onChange={(e) => setSalaryTemplateDialog({ ...salaryTemplateDialog, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Boş bırakılırsa 1 yıl boyunca oluşturulur"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalaryTemplateDialog({ ...salaryTemplateDialog, open: false })}>
            İptal
          </Button>
          <Button
            onClick={handleCreateSalaryTemplate}
            variant="contained"
            color="secondary"
            startIcon={<AccountBalance />}
          >
            Şablon Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Salary Expense Amount Dialog */}
      <Dialog
        open={editSalaryDialog.open}
        onClose={() => !editSalaryDialog.saving && setEditSalaryDialog({ open: false, expense: null, newAmount: '', error: '', saving: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Maaş Tutarını Düzenle</DialogTitle>
        <DialogContent>
          {editSalaryDialog.expense && (
            <>
              <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                <Typography variant="body2">
                  <strong>{editSalaryDialog.expense.description}</strong>
                </Typography>
                <Typography variant="caption">
                  Mevcut tutar: ₺{editSalaryDialog.expense.amount?.toLocaleString('tr-TR')}
                </Typography>
              </Alert>

              {editSalaryDialog.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {editSalaryDialog.error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Yeni Tutar"
                type="number"
                value={editSalaryDialog.newAmount}
                onChange={(e) => setEditSalaryDialog(prev => ({ ...prev, newAmount: e.target.value, error: '' }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 100 }}
                autoFocus
              />

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Bu değişiklik sadece bu ayın maaş giderini etkiler. Şablon tutarı değişmez.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEditSalaryDialog({ open: false, expense: null, newAmount: '', error: '', saving: false })}
            disabled={editSalaryDialog.saving}
          >
            İptal
          </Button>
          <Button
            onClick={handleSaveEditSalary}
            variant="contained"
            color="primary"
            disabled={editSalaryDialog.saving}
            startIcon={<Edit />}
          >
            {editSalaryDialog.saving ? 'Kaydediliyor...' : 'Tutarı Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reverse Payment Dialog */}
      <Dialog
        open={reversePaymentDialog.open}
        onClose={() => !reversePaymentDialog.processing && setReversePaymentDialog({ open: false, payment: null, processing: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ödeme Geri Al</DialogTitle>
        <DialogContent>
          {reversePaymentDialog.payment && (
            <>
              <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Bu işlem geri alınamaz!
                </Typography>
                <Typography variant="body2">
                  Aşağıdaki ödeme silinecek ve kasa bakiyesi otomatik olarak güncellenecektir.
                </Typography>
              </Alert>

              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Tarih:</strong> {new Date(reversePaymentDialog.payment.expenseDate).toLocaleDateString('tr-TR')}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Açıklama:</strong> {reversePaymentDialog.payment.description}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Kasa:</strong> {reversePaymentDialog.payment.cashRegister?.name || '-'}
                </Typography>
                <Typography variant="h6" color="error.main" sx={{ mt: 1 }}>
                  Tutar: ₺{reversePaymentDialog.payment.amount?.toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setReversePaymentDialog({ open: false, payment: null, processing: false })}
            disabled={reversePaymentDialog.processing}
          >
            İptal
          </Button>
          <Button
            onClick={handleReversePayment}
            variant="contained"
            color="warning"
            startIcon={<Undo />}
            disabled={reversePaymentDialog.processing}
          >
            {reversePaymentDialog.processing ? 'İşleniyor...' : 'Ödemeyi Geri Al'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstructorDetail;
