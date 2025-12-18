import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Paper,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Chip,
  IconButton,
  TextField,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Close,
  School,
  Visibility,
  Add,
  Delete,
  AccessTime,
  Person,
  Event,
  Warning,
  TrendingUp,
  AccountBalance,
  ShoppingCart,
  CalendarToday,
  Group,
  StarBorder,
  AttachMoney,
  Schedule,
  ArrowForward,
  CheckCircle,
  PendingActions,
  Send,
  LocalOffer,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SetupRequired from '../components/Common/SetupRequired';
import api from '../api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { sendWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATES, replaceTemplateVariables } from '../utils/whatsappHelper';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

// Helper function for local date
const getLocalDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper function to get color based on occupancy percentage (green to red)
const getOccupancyColor = (percentage) => {
  // 0% = green, 100% = red, interpolate hue from 120 to 0
  const hue = Math.max(0, 120 - (percentage * 1.2)); // 120 (green) to 0 (red)
  return `hsl(${hue}, 70%, 45%)`;
};

// Helper function to get discount chip color based on percentage (light blue to dark blue)
const getDiscountChipColor = (percentage) => {
  // 0% = light blue (#90CAF9), 100% = dark blue (#1565C0)
  // Interpolate lightness from 70% to 35%
  const lightness = Math.max(35, 70 - (percentage * 0.35));
  return `hsl(210, 79%, ${lightness}%)`;
};

const Dashboard = () => {
  const { institution, season, currentUser } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Permission helpers
  const hasPermission = (permission) => {
    if (currentUser?.role === 'superadmin') return true;
    return currentUser?.permissions?.[permission] !== false;
  };
  const canSeeFinancials = hasPermission('canManagePayments') || hasPermission('canManageExpenses');
  const canSeePayments = hasPermission('canManagePayments');
  const canSeeExpenses = hasPermission('canManageExpenses');

  // State
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalCashRegisterBalance: 0,
    totalCourses: 0,
    totalInstructors: 0,
  });

  // Discount statistics state
  const [discountStats, setDiscountStats] = useState({
    fullScholarship: { count: 0, totalAmount: 0 },
    byPercentage: {}, // e.g., { 50: { count: 2, totalAmount: 500 }, 10: { count: 3, totalAmount: 200 } }
    totalDiscountedStudents: 0,
    totalDiscountAmount: 0
  });

  const [todayLessons, setTodayLessons] = useState([]);
  const [trialLessons, setTrialLessons] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [allInstructors, setAllInstructors] = useState([]);
  const [instructorDebts, setInstructorDebts] = useState({ total: 0, instructors: [] });
  const [plannedInvestments, setPlannedInvestments] = useState({ total: 0, count: 0, items: [] });
  // Unified upcoming payments state
  const [upcomingPayments, setUpcomingPayments] = useState({
    overdue: { items: [], total: 0 },
    today: { items: [], total: 0 },
    thisWeek: { items: [], total: 0 },
    thisMonth: { items: [], total: 0 },
    nextMonth: { items: [], total: 0 },
    nextThreeMonths: { items: [], total: 0 },
    season: { items: [], total: 0 },
    all: []
  });
  const [incomeExpenseData, setIncomeExpenseData] = useState([]);

  // Dialogs
  const [studentsDialog, setStudentsDialog] = useState({ open: false, students: [] });
  const [paymentsDetailDialog, setPaymentsDetailDialog] = useState({ open: false, title: '', payments: [], type: '' });
  const [investmentDialog, setInvestmentDialog] = useState({ open: false, mode: 'list' });
  const [investmentForm, setInvestmentForm] = useState({
    title: '', description: '', estimatedAmount: '', category: 'other', priority: 'medium', targetDate: ''
  });
  const [upcomingPaymentsDialog, setUpcomingPaymentsDialog] = useState({ open: false });
  const [todayLessonsDialog, setTodayLessonsDialog] = useState({ open: false });
  const [trialLessonsDialog, setTrialLessonsDialog] = useState({ open: false });
  const [instructorDebtsDialog, setInstructorDebtsDialog] = useState({ open: false });
  // State for showing students in today's lessons dialog
  const [selectedLessonStudents, setSelectedLessonStudents] = useState({ lessonId: null, students: [] });
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [discountStudentsDialog, setDiscountStudentsDialog] = useState({ open: false, title: '', students: [], discountType: '' });
  const [pendingExpenses, setPendingExpenses] = useState({ overdue: [], thisWeek: [], upcoming: [], totals: {} });

  useEffect(() => {
    if (institution && season) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [institution, season]);

  // Load message templates from DB
  useEffect(() => {
    if (institution?._id) {
      loadMessageTemplates();
    }
  }, [institution?._id]);

  const loadMessageTemplates = async () => {
    try {
      const response = await api.get('/message-templates', {
        params: { institution: institution._id }
      });
      setMessageTemplates(response.data);
    } catch (error) {
      console.error('Error loading message templates:', error);
    }
  };

  // Get template content from DB or fallback to default
  const getTemplateContent = (templateType) => {
    const dbTemplate = messageTemplates.find(t => t.type === templateType);
    if (dbTemplate) return dbTemplate.template;
    return DEFAULT_WHATSAPP_TEMPLATES[templateType] || DEFAULT_WHATSAPP_TEMPLATES.general;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
        loadTodayLessons(),
        loadTrialLessons(),
        loadCourseStats(),
        loadInstructorDebts(),
        loadPlannedInvestments(),
        loadUpcomingPayments(),
        loadChartData(),
        loadEnrollments(),
        loadDiscountStats(),
        loadPendingExpenses(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      const response = await api.get('/enrollments', {
        params: { seasonId: season._id, isActive: true, populate: 'student' }
      });
      setAllEnrollments(response.data);
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  };

  const loadPendingExpenses = async () => {
    try {
      const response = await api.get('/recurring-expenses/pending/list', {
        params: { institution: institution._id, season: season._id, days: 30 }
      });
      setPendingExpenses(response.data);
    } catch (error) {
      console.error('Error loading pending expenses:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await api.get('/reports/dashboard', {
        params: { institutionId: institution._id, seasonId: season._id }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDiscountStats = async () => {
    try {
      const response = await api.get('/students', {
        params: {
          institutionId: institution._id,
          seasonId: season._id,
          includeDiscountInfo: 'true'
        }
      });

      const students = response.data;

      // Calculate discount statistics
      const discountData = {
        fullScholarship: { count: 0, totalAmount: 0 },
        byPercentage: {},
        totalDiscountedStudents: 0,
        totalDiscountAmount: 0
      };

      students.forEach(student => {
        if (student.discounts && student.discounts.length > 0) {
          discountData.totalDiscountedStudents++;

          student.discounts.forEach(discount => {
            const discountAmount = discount.discountAmount || 0;

            if (discount.type === 'fullScholarship') {
              discountData.fullScholarship.count++;
              discountData.fullScholarship.totalAmount += discountAmount;
            } else {
              // Group by percentage value
              const percentageKey = discount.percentageValue || discount.value;
              if (!discountData.byPercentage[percentageKey]) {
                discountData.byPercentage[percentageKey] = { count: 0, totalAmount: 0 };
              }
              discountData.byPercentage[percentageKey].count++;
              discountData.byPercentage[percentageKey].totalAmount += discountAmount;
            }

            discountData.totalDiscountAmount += discountAmount;
          });
        }
      });

      setDiscountStats(discountData);
    } catch (error) {
      console.error('Error loading discount stats:', error);
    }
  };

  const loadTodayLessons = async () => {
    try {
      const today = getLocalDateStr(new Date());
      const response = await api.get('/scheduled-lessons', {
        params: {
          institutionId: institution._id,
          seasonId: season._id,
          startDate: today,
          endDate: today
        }
      });
      const sorted = response.data.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setTodayLessons(sorted);
    } catch (error) {
      console.error('Error loading today lessons:', error);
    }
  };

  const loadTrialLessons = async () => {
    try {
      const response = await api.get('/trial-lessons', {
        params: {
          institutionId: institution._id,
          status: 'pending'
        }
      });
      const sorted = response.data.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
      setTrialLessons(sorted);
    } catch (error) {
      console.error('Error loading trial lessons:', error);
    }
  };

  const loadCourseStats = async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/courses', { params: { institution: institution._id, season: season._id } }),
        api.get('/enrollments', { params: { seasonId: season._id, isActive: true } })
      ]);

      const courses = coursesRes.data;
      const enrollments = enrollmentsRes.data;

      const stats = courses.map(course => {
        const enrolled = enrollments.filter(e => e.course?._id === course._id).length;
        const capacity = course.capacity || course.maxStudents || 15;
        return {
          ...course,
          enrolledCount: enrolled,
          capacity: capacity,
          percentage: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0
        };
      });

      setCourseStats(stats.sort((a, b) => b.enrolledCount - a.enrolledCount));
    } catch (error) {
      console.error('Error loading course stats:', error);
    }
  };

  const loadInstructorDebts = async () => {
    try {
      const response = await api.get('/instructors', {
        params: { institutionId: institution._id, seasonId: season._id }
      });
      const all = response.data;
      setAllInstructors(all);
      const instructorsWithDebt = all.filter(i => (i.balance || 0) > 0);
      const total = instructorsWithDebt.reduce((sum, i) => sum + (i.balance || 0), 0);
      setInstructorDebts({ total, instructors: instructorsWithDebt });
    } catch (error) {
      console.error('Error loading instructor debts:', error);
    }
  };

  const loadPlannedInvestments = async () => {
    try {
      const response = await api.get('/planned-investments', {
        params: { institution: institution._id, status: 'planned' }
      });
      const items = response.data;
      const total = items.reduce((sum, i) => sum + (i.estimatedAmount || 0), 0);
      setPlannedInvestments({ total, count: items.length, items });
    } catch (error) {
      console.error('Error loading planned investments:', error);
    }
  };

  // Unified function to load all upcoming payments
  const loadUpcomingPayments = async () => {
    try {
      const response = await api.get('/payment-plans', {
        params: { institutionId: institution._id, seasonId: season._id }
      });
      const paymentPlans = response.data;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      const endOfWeek = new Date(startOfToday);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      const endOfThreeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      const seasonEnd = season.endDate ? new Date(season.endDate) : endOfThreeMonths;

      const categorized = {
        overdue: { items: [], total: 0 },
        today: { items: [], total: 0 },
        thisWeek: { items: [], total: 0 },
        thisMonth: { items: [], total: 0 },
        nextMonth: { items: [], total: 0 },
        nextThreeMonths: { items: [], total: 0 },
        season: { items: [], total: 0 },
        all: []
      };

      paymentPlans.forEach(plan => {
        plan.installments?.forEach(inst => {
          if (!inst.isPaid) {
            const dueDate = new Date(inst.dueDate);
            const remaining = inst.amount - (inst.paidAmount || 0);

            if (remaining <= 0) return;

            const payment = {
              student: plan.student,
              course: plan.course,
              installmentNumber: inst.installmentNumber,
              amount: remaining,
              dueDate: dueDate,
              paymentPlanId: plan._id,
              // Include plan totals for template
              totalInstallments: plan.installments?.length || 0,
              totalAmount: plan.discountedAmount || plan.totalAmount || 0,
              paidAmount: plan.paidAmount || 0,
              remainingAmount: plan.remainingAmount || 0
            };

            categorized.all.push(payment);

            // Categorize by time period
            if (dueDate < startOfToday) {
              categorized.overdue.items.push(payment);
              categorized.overdue.total += remaining;
            } else if (dueDate < endOfToday) {
              categorized.today.items.push(payment);
              categorized.today.total += remaining;
            } else if (dueDate < endOfWeek) {
              categorized.thisWeek.items.push(payment);
              categorized.thisWeek.total += remaining;
            } else if (dueDate <= endOfMonth) {
              categorized.thisMonth.items.push(payment);
              categorized.thisMonth.total += remaining;
            } else if (dueDate <= endOfNextMonth) {
              categorized.nextMonth.items.push(payment);
              categorized.nextMonth.total += remaining;
            }

            // Cumulative totals for 3 months and season
            if (dueDate <= endOfThreeMonths && dueDate >= startOfToday) {
              categorized.nextThreeMonths.items.push(payment);
              categorized.nextThreeMonths.total += remaining;
            }
            if (dueDate <= seasonEnd) {
              categorized.season.items.push(payment);
              categorized.season.total += remaining;
            }
          }
        });
      });

      // Sort all arrays by due date
      Object.keys(categorized).forEach(key => {
        if (key === 'all') {
          categorized.all.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        } else {
          categorized[key].items.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        }
      });

      setUpcomingPayments(categorized);
    } catch (error) {
      console.error('Error loading upcoming payments:', error);
    }
  };

  const loadChartData = async () => {
    try {
      const response = await api.get('/reports/income-expense-chart', {
        params: { institutionId: institution._id, seasonId: season._id }
      });
      setIncomeExpenseData(response.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  // Investment handlers
  const handleSaveInvestment = async () => {
    try {
      await api.post('/planned-investments', {
        ...investmentForm,
        estimatedAmount: parseFloat(investmentForm.estimatedAmount) || 0,
        institution: institution._id,
        createdBy: currentUser?.username
      });
      setInvestmentForm({ title: '', description: '', estimatedAmount: '', category: 'other', priority: 'medium', targetDate: '' });
      setInvestmentDialog({ open: true, mode: 'list' });
      loadPlannedInvestments();
    } catch (error) {
      alert('Kayit hatasi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteInvestment = async (id) => {
    if (!window.confirm('Bu plani silmek istediginizden emin misiniz?')) return;
    try {
      await api.delete(`/planned-investments/${id}`);
      loadPlannedInvestments();
    } catch (error) {
      alert('Silme hatasi: ' + error.message);
    }
  };

  const handleCompleteInvestment = async (id) => {
    try {
      await api.put(`/planned-investments/${id}`, {
        status: 'completed',
        completedDate: new Date(),
        updatedBy: currentUser?.username
      });
      loadPlannedInvestments();
    } catch (error) {
      alert('Guncelleme hatasi: ' + error.message);
    }
  };

  // Students dialog
  const handleStudentsClick = async () => {
    try {
      const response = await api.get('/students', {
        params: { institutionId: institution._id, seasonId: season._id }
      });
      setStudentsDialog({ open: true, students: response.data });
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  // Discount students dialog - show students with specific discount
  const handleDiscountChipClick = async (discountType, percentage = null) => {
    try {
      const response = await api.get('/students', {
        params: {
          institutionId: institution._id,
          seasonId: season._id,
          includeDiscountInfo: 'true'
        }
      });

      const allStudents = response.data;
      let filteredStudents = [];
      let title = '';

      if (discountType === 'fullScholarship') {
        title = 'Tam Burslu Öğrenciler';
        filteredStudents = allStudents.filter(student =>
          student.discounts?.some(d => d.type === 'fullScholarship')
        );
      } else if (percentage !== null) {
        title = `%${percentage} İndirimli Öğrenciler`;
        filteredStudents = allStudents.filter(student =>
          student.discounts?.some(d => {
            const pValue = d.percentageValue || d.value;
            return d.type !== 'fullScholarship' && pValue == percentage;
          })
        );
      }

      setDiscountStudentsDialog({
        open: true,
        title,
        students: filteredStudents,
        discountType: discountType === 'fullScholarship' ? 'fullScholarship' : `percent_${percentage}`
      });
    } catch (error) {
      console.error('Error loading discount students:', error);
    }
  };

  const handlePaymentsBoxClick = (type, title, payments) => {
    setPaymentsDetailDialog({ open: true, title, payments, type });
  };

  // Send payment reminder via WhatsApp
  const handleSendPaymentReminder = (payment, isOverdue = false) => {
    const student = payment.student;
    if (!student) return;

    // Get phone based on defaultNotificationRecipient
    const recipientType = student.defaultNotificationRecipient || 'student';
    const mother = student.parentContacts?.find(p => p.relationship === 'Anne');
    const father = student.parentContacts?.find(p => p.relationship === 'Baba');

    let phone = null;
    let recipientName = `${student.firstName} ${student.lastName}`;

    switch (recipientType) {
      case 'mother':
        phone = mother?.phone;
        if (mother?.name) { recipientName = mother.name; }
        break;
      case 'father':
        phone = father?.phone;
        if (father?.name) { recipientName = father.name; }
        break;
      default:
        phone = student.phone;
        break;
    }

    // Fallback
    if (!phone) {
      phone = student.phone || mother?.phone || father?.phone;
    }

    if (!phone) {
      alert('Telefon numarası bulunamadı');
      return;
    }

    const studentName = `${student.firstName} ${student.lastName}`;

    // Calculate overdue days if applicable
    const dueDate = new Date(payment.dueDate);
    const today = new Date();
    const overdueDays = isOverdue ? Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

    // Prepare data for template variable replacement
    const templateData = {
      recipientName,
      studentName,
      courseName: payment.course?.name || '',
      amount: payment.amount,
      dueDate: payment.dueDate,
      installmentNumber: payment.installmentNumber,
      totalInstallments: payment.totalInstallments || 0,
      totalAmount: payment.totalAmount || 0,
      paidAmount: payment.paidAmount || 0,
      remainingAmount: payment.remainingAmount || 0,
      institutionName: institution?.name || 'Kurum',
      overdueDays,
    };

    // Use paymentOverdue for overdue payments, paymentDueReminder for upcoming
    const template = isOverdue
      ? getTemplateContent('paymentOverdue')
      : getTemplateContent('paymentDueReminder');
    const message = replaceTemplateVariables(template, templateData);

    sendWhatsAppMessage(phone, message, {});
  };

  // Get students enrolled in a specific course
  const getLessonStudents = (courseId) => {
    if (!courseId) return [];
    return allEnrollments
      .filter(e => e.course?._id === courseId && e.student)
      .map(e => e.student);
  };

  // Handle clicking on a lesson row to show students
  const handleLessonClick = (lesson) => {
    if (selectedLessonStudents.lessonId === lesson._id) {
      // Toggle off if clicking same lesson
      setSelectedLessonStudents({ lessonId: null, students: [] });
    } else {
      const students = getLessonStudents(lesson.course?._id);
      setSelectedLessonStudents({ lessonId: lesson._id, students });
    }
  };

  // Direct lesson reminder WhatsApp send for students
  const handleLessonReminderClick = (event, student, lesson) => {
    event.stopPropagation();

    if (!student) {
      alert('Öğrenci bilgisi bulunamadı');
      return;
    }

    // Get phone based on defaultNotificationRecipient
    const recipientType = student.defaultNotificationRecipient || 'student';
    const mother = student.parentContacts?.find(p => p.relationship === 'Anne');
    const father = student.parentContacts?.find(p => p.relationship === 'Baba');

    let phone = null;
    let recipientName = `${student.firstName} ${student.lastName}`;
    let isParent = false;

    switch (recipientType) {
      case 'mother':
        phone = mother?.phone;
        if (mother?.name) { recipientName = mother.name; isParent = true; }
        break;
      case 'father':
        phone = father?.phone;
        if (father?.name) { recipientName = father.name; isParent = true; }
        break;
      default:
        phone = student.phone;
        break;
    }

    // Fallback to any available phone
    if (!phone) {
      phone = student.phone || mother?.phone || father?.phone;
      if (!phone) {
        alert('Telefon numarası bulunamadı');
        return;
      }
    }

    const studentName = `${student.firstName} ${student.lastName}`;
    const courseName = lesson?.course?.name || '';
    const lessonTime = lesson ? `${lesson.startTime}-${lesson.endTime}` : '';
    const today = new Date().toLocaleDateString('tr-TR');

    // Build lesson reminder message
    const message = `Sayın ${recipientName},

${isParent ? `Öğrenciniz ${studentName} için ders hatırlatması:` : 'Ders hatırlatması:'}

📚 *BUGÜNKÜ DERS*
Ders: ${courseName}
Tarih: ${today}
Saat: ${lessonTime}

Lütfen dersinize zamanında katılınız.

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
${institution?.name || 'FOFORA TİYATRO'}`;

    sendWhatsAppMessage(phone, message, {});
  };

  if (loading) {
    return <LoadingSpinner message="Panel yukleniyor..." />;
  }

  if (!institution) return <SetupRequired type="institution" />;
  if (!season) return <SetupRequired type="season" />;

  const getCategoryLabel = (cat) => {
    const labels = {
      equipment: 'Ekipman', furniture: 'Mobilya', renovation: 'Tadilat',
      event: 'Etkinlik', marketing: 'Pazarlama', education: 'Egitim', other: 'Diger'
    };
    return labels[cat] || cat;
  };

  const getPriorityColor = (priority) => {
    const colors = { urgent: 'error', high: 'warning', medium: 'info', low: 'default' };
    return colors[priority] || 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Panel</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<Add />} onClick={() => navigate('/students/new')}>Ogrenci</Button>
          <Button size="small" startIcon={<Event />} onClick={() => navigate('/calendar')}>Takvim</Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* TOP ROW - Key Stats - Consistent 2-column layout at md */}
        {/* First Row: Students (wider) + 3 small stat cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, cursor: 'pointer', height: '100%', minHeight: 140, '&:hover': { bgcolor: 'action.hover' } }} onClick={handleStudentsClick}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Group color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h4" sx={{ lineHeight: 1 }}>{stats.totalStudents}</Typography>
                  <Typography variant="caption" color="text.secondary">Öğrenci</Typography>
                </Box>
              </Box>
              <Chip size="small" label={`${stats.activeStudents} aktif`} color="primary" variant="outlined" />
            </Box>

            {/* Discount Breakdown - Scrollable */}
            {discountStats.totalDiscountedStudents > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  gap: 0.5,
                  mb: 1,
                  overflowX: 'auto',
                  pb: 0.5,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 2 }
                }}>
                  {discountStats.fullScholarship.count > 0 && (
                    <Tooltip title={`Toplam: ${discountStats.fullScholarship.totalAmount.toLocaleString('tr-TR')} TL - Tıkla öğrencileri gör`}>
                      <Chip
                        size="small"
                        icon={<School sx={{ fontSize: 14 }} />}
                        label={`Burslu: ${discountStats.fullScholarship.count}`}
                        color="success"
                        onClick={(e) => { e.stopPropagation(); handleDiscountChipClick('fullScholarship'); }}
                        sx={{ fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0 }}
                      />
                    </Tooltip>
                  )}
                  {Object.entries(discountStats.byPercentage)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([percentage, data]) => (
                      <Tooltip key={percentage} title={`Toplam: ${data.totalAmount.toLocaleString('tr-TR')} TL - Tıkla öğrencileri gör`}>
                        <Chip
                          size="small"
                          icon={<LocalOffer sx={{ fontSize: 14, color: 'white' }} />}
                          label={`%${percentage}: ${data.count}`}
                          onClick={(e) => { e.stopPropagation(); handleDiscountChipClick('percentage', percentage); }}
                          sx={{
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            flexShrink: 0,
                            bgcolor: getDiscountChipColor(Number(percentage)),
                            color: 'white',
                            '& .MuiChip-label': { color: 'white' }
                          }}
                        />
                      </Tooltip>
                    ))
                  }
                </Box>
                <Box sx={{ textAlign: 'center', bgcolor: 'grey.100', borderRadius: 1, py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Toplam İndirim/Burs:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {discountStats.totalDiscountAmount.toLocaleString('tr-TR')} TL
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* Eğitmen Card */}
        <Grid item xs={6} sm={6} md={2}>
          <Paper sx={{ p: 1.5, cursor: 'pointer', height: '100%', minHeight: 140, '&:hover': { bgcolor: 'action.hover' } }} onClick={() => setInstructorDebtsDialog({ open: true })}>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Person color="secondary" sx={{ fontSize: 24 }} />
                <Typography variant="h5">{stats.totalInstructors || allInstructors.length}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">Eğitmen</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ maxHeight: 80, overflow: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 2 } }}>
              {allInstructors.slice(0, 5).map((inst) => (
                <Typography key={inst._id} variant="caption" sx={{ display: 'block', py: 0.25, color: inst.balance > 0 ? 'warning.main' : 'text.secondary' }}>
                  • {inst.firstName} {inst.lastName}{inst.balance > 0 ? ` (${inst.balance.toLocaleString('tr-TR')}₺)` : ''}
                </Typography>
              ))}
              {allInstructors.length > 5 && (
                <Typography variant="caption" color="primary">+{allInstructors.length - 5} daha...</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Bugün Ders Card */}
        <Grid item xs={6} sm={6} md={2}>
          <Paper sx={{ p: 1.5, cursor: 'pointer', height: '100%', minHeight: 140, '&:hover': { bgcolor: 'action.hover' } }} onClick={() => setTodayLessonsDialog({ open: true })}>
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Schedule color="info" sx={{ fontSize: 24 }} />
                <Typography variant="h5">{todayLessons.length}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">Bugün Ders</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ maxHeight: 80, overflow: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 2 } }}>
              {todayLessons.length === 0 ? (
                <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>Ders yok</Typography>
              ) : (
                todayLessons.slice(0, 5).map((lesson) => (
                  <Typography key={lesson._id} variant="caption" sx={{ display: 'block', py: 0.25, color: lesson.status === 'completed' ? 'success.main' : 'text.secondary' }}>
                    • {lesson.startTime} {lesson.course?.name?.substring(0, 12)}{lesson.course?.name?.length > 12 ? '...' : ''}
                  </Typography>
                ))
              )}
              {todayLessons.length > 5 && (
                <Typography variant="caption" color="primary">+{todayLessons.length - 5} daha...</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Toplam Gelir Card */}
        {canSeePayments && (
          <Grid item xs={6} sm={6} md={2}>
            <Paper sx={{ p: 1.5, height: '100%', minHeight: 140 }}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <TrendingUp color="success" sx={{ fontSize: 24 }} />
                  <Typography variant="h6" color="success.main">{(stats.totalIncome || 0).toLocaleString('tr-TR')}₺</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Toplam Gelir</Typography>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ maxHeight: 80, overflow: 'auto' }}>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Gider: <span style={{ color: '#f44336' }}>{(stats.totalExpenses || 0).toLocaleString('tr-TR')}₺</span>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Net: <span style={{ color: (stats.totalIncome - stats.totalExpenses) >= 0 ? '#4caf50' : '#f44336' }}>{((stats.totalIncome || 0) - (stats.totalExpenses || 0)).toLocaleString('tr-TR')}₺</span>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Bekleyen: <span style={{ color: '#ff9800' }}>{(upcomingPayments.season?.total || 0).toLocaleString('tr-TR')}₺</span>
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Kasa Card */}
        {canSeeExpenses && (
          <Grid item xs={6} sm={6} md={2}>
            <Paper sx={{ p: 1.5, height: '100%', minHeight: 140 }}>
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <AccountBalance color="warning" sx={{ fontSize: 24 }} />
                  <Typography variant="h6" color="warning.main">{(stats.totalCashRegisterBalance || 0).toLocaleString('tr-TR')}₺</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Kasa</Typography>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ maxHeight: 80, overflow: 'auto' }}>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Eğitmen Borcu: <span style={{ color: '#ff9800' }}>{(instructorDebts.total || 0).toLocaleString('tr-TR')}₺</span>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Plan. Harcama: <span style={{ color: '#2196f3' }}>{(plannedInvestments.total || 0).toLocaleString('tr-TR')}₺</span>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Tahmini Net: <span style={{ color: '#4caf50' }}>{((stats.totalCashRegisterBalance || 0) - (instructorDebts.total || 0) - (plannedInvestments.total || 0)).toLocaleString('tr-TR')}₺</span>
                </Typography>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Second Row Start - Planlanan Harcama aligned with above */}
        <Grid item xs={6} sm={6} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', cursor: 'pointer', bgcolor: 'primary.light', color: 'white', height: '100%', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { bgcolor: 'primary.main' } }} onClick={() => setInvestmentDialog({ open: true, mode: 'list' })}>
            <ShoppingCart sx={{ fontSize: 32 }} />
            <Typography variant="h5">{plannedInvestments.total.toLocaleString('tr-TR')} TL</Typography>
            <Typography variant="body2">Planlanan Harcama</Typography>
            <Chip size="small" label={`${plannedInvestments.count} plan`} sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.3)' }} />
          </Paper>
        </Grid>

        {/* Bekleyen Giderler Widget */}
        {canSeeExpenses && (
          <Grid item xs={6} sm={6} md={2}>
            <Paper
              sx={{
                p: 1.5,
                cursor: 'pointer',
                height: '100%',
                minHeight: 140,
                bgcolor: pendingExpenses.totals?.overdueCount > 0 ? 'error.light' :
                         pendingExpenses.totals?.thisWeekCount > 0 ? 'warning.light' : 'grey.100',
                '&:hover': { opacity: 0.9 }
              }}
              onClick={() => navigate('/recurring-expenses')}
            >
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  {pendingExpenses.totals?.overdueCount > 0 ? (
                    <Warning sx={{ fontSize: 24, color: 'error.dark' }} />
                  ) : (
                    <Schedule sx={{ fontSize: 24, color: 'text.secondary' }} />
                  )}
                  <Typography variant="h6">
                    {((pendingExpenses.totals?.overdueAmount || 0) + (pendingExpenses.totals?.thisWeekAmount || 0)).toLocaleString('tr-TR')}₺
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">Bekleyen Giderler</Typography>
              </Box>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ maxHeight: 70, overflow: 'auto' }}>
                {pendingExpenses.totals?.overdueCount > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', py: 0.25, color: 'error.dark', fontWeight: 'bold' }}>
                    • Gecikmiş: {pendingExpenses.totals.overdueCount} ({(pendingExpenses.totals.overdueAmount || 0).toLocaleString('tr-TR')}₺)
                  </Typography>
                )}
                {pendingExpenses.totals?.thisWeekCount > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', py: 0.25, color: 'warning.dark' }}>
                    • Bu Hafta: {pendingExpenses.totals.thisWeekCount} ({(pendingExpenses.totals.thisWeekAmount || 0).toLocaleString('tr-TR')}₺)
                  </Typography>
                )}
                {pendingExpenses.totals?.upcomingCount > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                    • Yaklaşan: {pendingExpenses.totals.upcomingCount}
                  </Typography>
                )}
                {!pendingExpenses.totals?.overdueCount && !pendingExpenses.totals?.thisWeekCount && !pendingExpenses.totals?.upcomingCount && (
                  <Typography variant="caption" sx={{ display: 'block', py: 0.25, color: 'success.main' }}>
                    Bekleyen gider yok
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Second Row - Today's Schedule & Urgent */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%', minHeight: 220 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6"><CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />Bugunku Program</Typography>
              <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/calendar')}>Takvim</Button>
            </Box>
            {todayLessons.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Bugun planlanmis ders yok</Typography>
            ) : (
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {todayLessons.slice(0, 5).map((lesson) => (
                  <ListItem key={lesson._id} sx={{ bgcolor: lesson.status === 'completed' ? 'success.light' : 'transparent', borderRadius: 1, mb: 0.5 }}>
                    <ListItemIcon><AccessTime fontSize="small" /></ListItemIcon>
                    <ListItemText
                      primary={`${lesson.startTime}-${lesson.endTime} ${lesson.course?.name || 'Ders'}${lesson.notes ? ` - ${lesson.notes}` : ''}`}
                      secondary={lesson.instructor ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}` : 'Egitmen atanmadi'}
                    />
                    {lesson.status === 'completed' && <CheckCircle color="success" fontSize="small" />}
                  </ListItem>
                ))}
                {todayLessons.length > 5 && (
                  <Button size="small" fullWidth onClick={() => setTodayLessonsDialog({ open: true })}>
                    +{todayLessons.length - 5} ders daha
                  </Button>
                )}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%', minHeight: 220 }}>
            <Typography variant="h6" sx={{ mb: 2 }}><Warning color="error" sx={{ mr: 1, verticalAlign: 'middle' }} />Acil / Oncelikli</Typography>
            <List dense>
              {upcomingPayments.overdue.items.length > 0 && (
                <ListItem button onClick={() => handlePaymentsBoxClick('overdue', 'Gecikmis Odemeler', upcomingPayments.overdue.items)} sx={{ bgcolor: 'error.light', borderRadius: 1, mb: 0.5 }}>
                  <ListItemText
                    primary={<Typography color="error.dark" fontWeight="bold">{upcomingPayments.overdue.items.length} Gecikmis Odeme</Typography>}
                    secondary={`${upcomingPayments.overdue.total.toLocaleString('tr-TR')} TL`}
                  />
                </ListItem>
              )}
              {upcomingPayments.today.items.length > 0 && (
                <ListItem button onClick={() => handlePaymentsBoxClick('today', 'Bugunku Odemeler', upcomingPayments.today.items)} sx={{ bgcolor: 'warning.light', borderRadius: 1, mb: 0.5 }}>
                  <ListItemText
                    primary={<Typography color="warning.dark" fontWeight="bold">{upcomingPayments.today.items.length} Bugun Vadeli</Typography>}
                    secondary={`${upcomingPayments.today.total.toLocaleString('tr-TR')} TL`}
                  />
                </ListItem>
              )}
              {trialLessons.length > 0 && (
                <ListItem button onClick={() => setTrialLessonsDialog({ open: true })} sx={{ bgcolor: 'info.light', borderRadius: 1, mb: 0.5 }}>
                  <ListItemIcon><StarBorder /></ListItemIcon>
                  <ListItemText
                    primary={<Typography color="info.dark" fontWeight="bold">{trialLessons.length} Deneme Dersi</Typography>}
                    secondary="Bekleyen"
                  />
                </ListItem>
              )}
              {instructorDebts.total > 0 && (
                <ListItem button onClick={() => setInstructorDebtsDialog({ open: true })} sx={{ bgcolor: 'grey.200', borderRadius: 1 }}>
                  <ListItemIcon><AttachMoney /></ListItemIcon>
                  <ListItemText
                    primary="Egitmen Borclari"
                    secondary={`${instructorDebts.total.toLocaleString('tr-TR')} TL`}
                  />
                </ListItem>
              )}
              {upcomingPayments.overdue.items.length === 0 && upcomingPayments.today.items.length === 0 && trialLessons.length === 0 && instructorDebts.total === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>Acil durum yok</Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Third Row - Course Capacity & Trial Lessons */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', minHeight: 220 }}>
            <Typography variant="h6" sx={{ mb: 2 }}><School sx={{ mr: 1, verticalAlign: 'middle' }} />Ders Doluluk Durumu</Typography>
            {courseStats.length === 0 ? (
              <Typography color="text.secondary" align="center">Ders bulunamadi</Typography>
            ) : (
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {courseStats.slice(0, 5).map((course) => {
                  const occupancyColor = getOccupancyColor(course.percentage);
                  return (
                    <Box key={course._id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{course.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{course.enrolledCount}/{course.capacity}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(course.percentage, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: occupancyColor,
                            borderRadius: 4,
                          }
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', minHeight: 220 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6"><StarBorder sx={{ mr: 1, verticalAlign: 'middle' }} />Deneme Dersleri</Typography>
              <Button size="small" onClick={() => navigate('/trial-lessons')}>Tumu</Button>
            </Box>
            {trialLessons.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>Bekleyen deneme dersi yok</Typography>
            ) : (
              <List dense sx={{ maxHeight: 180, overflow: 'auto' }}>
                {trialLessons.slice(0, 4).map((trial) => (
                  <ListItem key={trial._id}>
                    <ListItemText
                      primary={`${trial.firstName} ${trial.lastName}`}
                      secondary={`${new Date(trial.scheduledDate).toLocaleDateString('tr-TR')} ${trial.scheduledTime} - ${trial.course?.name || ''}`}
                    />
                    <Chip size="small" color="warning" label="Bekliyor" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Fourth Row - Unified Payment Tracking */}
        {canSeePayments && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6"><PendingActions sx={{ mr: 1, verticalAlign: 'middle' }} />Gelecek Odemeler (Alacaklar)</Typography>
                <Button size="small" endIcon={<ArrowForward />} onClick={() => setUpcomingPaymentsDialog({ open: true })}>Tum Detaylar</Button>
              </Box>

              {/* Time-based breakdown */}
              <Grid container spacing={1}>
                {[
                  { key: 'overdue', label: 'Gecikmis', color: 'error.main', textColor: 'white', icon: '⚠️' },
                  { key: 'today', label: 'Bugun', color: 'warning.main', textColor: 'white', icon: '📅' },
                  { key: 'thisWeek', label: 'Bu Hafta', color: 'info.main', textColor: 'white', icon: '📆' },
                  { key: 'thisMonth', label: 'Bu Ay', color: 'success.main', textColor: 'white', icon: '🗓️' },
                  { key: 'nextMonth', label: 'Gelecek Ay', color: 'grey.600', textColor: 'white', icon: '➡️' },
                ].map(({ key, label, color, textColor, icon }) => (
                  <Grid item xs={6} sm={2.4} key={key}>
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: color,
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: upcomingPayments[key].items.length > 0 ? 'pointer' : 'default',
                        transition: 'transform 0.2s',
                        '&:hover': upcomingPayments[key].items.length > 0 ? { transform: 'scale(1.02)' } : {}
                      }}
                      onClick={() => upcomingPayments[key].items.length > 0 && handlePaymentsBoxClick(key, label, upcomingPayments[key].items)}
                    >
                      <Typography variant="body2" color={textColor} fontWeight="bold">{label}</Typography>
                      <Typography variant="h5" color={textColor} fontWeight="bold">{upcomingPayments[key].items.length}</Typography>
                      <Typography variant="body2" color={textColor}>{upcomingPayments[key].total.toLocaleString('tr-TR')} TL</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Summary totals */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Toplam Alacak (3 Ay)</Typography>
                      <Typography variant="h5" color="info.main" fontWeight="bold">
                        {upcomingPayments.nextThreeMonths.total.toLocaleString('tr-TR')} TL
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Toplam Alacak (Sezon)</Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {upcomingPayments.season.total.toLocaleString('tr-TR')} TL
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Gecikmis + Bugun</Typography>
                      <Typography variant="h5" color="error.main" fontWeight="bold">
                        {(upcomingPayments.overdue.total + upcomingPayments.today.total).toLocaleString('tr-TR')} TL
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Charts */}
        {canSeeFinancials && incomeExpenseData.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Gelir/Gider Trendi</Typography>
              <Box sx={{ height: 250 }}>
                <Line
                  data={{
                    labels: incomeExpenseData.map(d => d.period),
                    datasets: [
                      { label: 'Gelir', data: incomeExpenseData.map(d => d.income), borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.1)', tension: 0.3 },
                      { label: 'Gider', data: incomeExpenseData.map(d => d.expense), borderColor: '#f44336', backgroundColor: 'rgba(244,67,54,0.1)', tension: 0.3 }
                    ]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString('tr-TR') + ' TL' } } } }}
                />
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* DIALOGS */}

      {/* Planned Investments Dialog */}
      <Dialog open={investmentDialog.open} onClose={() => setInvestmentDialog({ open: false, mode: 'list' })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Planlanan Harcamalar / Yatirimlar</Typography>
          <Box>
            {investmentDialog.mode === 'list' && (
              <Button startIcon={<Add />} onClick={() => setInvestmentDialog({ open: true, mode: 'add' })}>Yeni Ekle</Button>
            )}
            <IconButton onClick={() => setInvestmentDialog({ open: false, mode: 'list' })}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {investmentDialog.mode === 'add' ? (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}><TextField fullWidth label="Baslik" value={investmentForm.title} onChange={e => setInvestmentForm({ ...investmentForm, title: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Aciklama" value={investmentForm.description} onChange={e => setInvestmentForm({ ...investmentForm, description: e.target.value })} /></Grid>
              <Grid item xs={6}><TextField fullWidth type="number" label="Tahmini Tutar (TL)" value={investmentForm.estimatedAmount} onChange={e => setInvestmentForm({ ...investmentForm, estimatedAmount: e.target.value })} /></Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Kategori</InputLabel>
                  <Select value={investmentForm.category} onChange={e => setInvestmentForm({ ...investmentForm, category: e.target.value })} label="Kategori">
                    <MenuItem value="equipment">Ekipman</MenuItem>
                    <MenuItem value="furniture">Mobilya</MenuItem>
                    <MenuItem value="renovation">Tadilat</MenuItem>
                    <MenuItem value="event">Etkinlik</MenuItem>
                    <MenuItem value="marketing">Pazarlama</MenuItem>
                    <MenuItem value="education">Egitim</MenuItem>
                    <MenuItem value="other">Diger</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Oncelik</InputLabel>
                  <Select value={investmentForm.priority} onChange={e => setInvestmentForm({ ...investmentForm, priority: e.target.value })} label="Oncelik">
                    <MenuItem value="low">Dusuk</MenuItem>
                    <MenuItem value="medium">Orta</MenuItem>
                    <MenuItem value="high">Yuksek</MenuItem>
                    <MenuItem value="urgent">Acil</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}><TextField fullWidth type="date" label="Hedef Tarih" InputLabelProps={{ shrink: true }} value={investmentForm.targetDate} onChange={e => setInvestmentForm({ ...investmentForm, targetDate: e.target.value })} /></Grid>
            </Grid>
          ) : (
            <>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="h5" color="primary.contrastText">Toplam: {plannedInvestments.total.toLocaleString('tr-TR')} TL</Typography>
                <Typography variant="body2" color="primary.contrastText">{plannedInvestments.count} adet plan</Typography>
              </Box>
              {plannedInvestments.items.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Henuz planlanan harcama yok</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Baslik</TableCell>
                        <TableCell>Kategori</TableCell>
                        <TableCell>Oncelik</TableCell>
                        <TableCell align="right">Tutar</TableCell>
                        <TableCell align="right">Islem</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plannedInvestments.items.map((inv) => (
                        <TableRow key={inv._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">{inv.title}</Typography>
                            {inv.description && <Typography variant="caption" color="text.secondary">{inv.description}</Typography>}
                          </TableCell>
                          <TableCell><Chip size="small" label={getCategoryLabel(inv.category)} /></TableCell>
                          <TableCell><Chip size="small" color={getPriorityColor(inv.priority)} label={inv.priority} /></TableCell>
                          <TableCell align="right">{inv.estimatedAmount?.toLocaleString('tr-TR')} TL</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="success" onClick={() => handleCompleteInvestment(inv._id)} title="Tamamlandi"><CheckCircle fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteInvestment(inv._id)}><Delete fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {investmentDialog.mode === 'add' ? (
            <>
              <Button onClick={() => setInvestmentDialog({ open: true, mode: 'list' })}>Geri</Button>
              <Button variant="contained" onClick={handleSaveInvestment}>Kaydet</Button>
            </>
          ) : (
            <Button onClick={() => setInvestmentDialog({ open: false, mode: 'list' })}>Kapat</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Upcoming Payments Full Detail Dialog */}
      <Dialog open={upcomingPaymentsDialog.open} onClose={() => setUpcomingPaymentsDialog({ open: false })} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Gelecek Odemeler - Detayli Gorunum</Typography>
            <IconButton onClick={() => setUpcomingPaymentsDialog({ open: false })}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { key: 'overdue', label: 'Gecikmis', color: 'error' },
              { key: 'today', label: 'Bugun', color: 'warning' },
              { key: 'thisWeek', label: 'Bu Hafta', color: 'info' },
              { key: 'thisMonth', label: 'Bu Ay', color: 'success' },
              { key: 'nextMonth', label: 'Gelecek Ay', color: 'secondary' },
              { key: 'season', label: 'Tum Sezon', color: 'primary' },
            ].map(({ key, label, color }) => (
              <Grid item xs={6} sm={4} md={2} key={key}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: `${color}.light` }}>
                  <Typography variant="caption" color={`${color}.dark`}>{label}</Typography>
                  <Typography variant="h6" color={`${color}.dark`} fontWeight="bold">{upcomingPayments[key]?.items?.length || 0}</Typography>
                  <Typography variant="body2" color={`${color}.dark`}>{(upcomingPayments[key]?.total || 0).toLocaleString('tr-TR')} TL</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* All Payments Table */}
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">Tum Beklenen Odemeler ({upcomingPayments.all?.length || 0})</Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Ogrenci</TableCell>
                  <TableCell>Ders</TableCell>
                  <TableCell>Taksit</TableCell>
                  <TableCell>Vade Tarihi</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(upcomingPayments.all || []).map((item, idx) => {
                  const dueDate = new Date(item.dueDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOverdue = dueDate < today;
                  const isToday = dueDate.toDateString() === today.toDateString();

                  return (
                    <TableRow key={idx} hover sx={{ bgcolor: isOverdue ? 'error.lighter' : isToday ? 'warning.lighter' : 'inherit' }}>
                      <TableCell>{item.student?.firstName} {item.student?.lastName}</TableCell>
                      <TableCell>{item.course?.name}</TableCell>
                      <TableCell>{item.installmentNumber}. Taksit</TableCell>
                      <TableCell>{dueDate.toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={isOverdue ? 'error' : isToday ? 'warning' : 'default'}
                          label={isOverdue ? 'Gecikmis' : isToday ? 'Bugun' : 'Bekliyor'}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setUpcomingPaymentsDialog({ open: false })}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Today's Lessons Dialog */}
      <Dialog open={todayLessonsDialog.open} onClose={() => { setTodayLessonsDialog({ open: false }); setSelectedLessonStudents({ lessonId: null, students: [] }); }} maxWidth="md" fullWidth>
        <DialogTitle>Bugunku Dersler ({todayLessons.length})</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Ogrenci listesini gormek icin ders satirina tiklayin
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Saat</TableCell>
                  <TableCell>Ders</TableCell>
                  <TableCell>Egitmen</TableCell>
                  <TableCell>Ogrenci</TableCell>
                  <TableCell>Durum</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayLessons.map((lesson) => {
                  const lessonStudentCount = getLessonStudents(lesson.course?._id).length;
                  const isSelected = selectedLessonStudents.lessonId === lesson._id;

                  return (
                    <React.Fragment key={lesson._id}>
                      <TableRow
                        hover
                        onClick={() => handleLessonClick(lesson)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'primary.light' : 'inherit',
                          '&:hover': { bgcolor: isSelected ? 'primary.light' : 'action.hover' }
                        }}
                      >
                        <TableCell>{lesson.startTime}-{lesson.endTime}</TableCell>
                        <TableCell>{lesson.course?.name}{lesson.notes && ` - ${lesson.notes}`}</TableCell>
                        <TableCell>{lesson.instructor ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}` : '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={<Group sx={{ fontSize: 14 }} />}
                            label={`${lessonStudentCount} ogrenci`}
                            color={isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={lesson.status === 'completed' ? 'success' : 'default'} label={lesson.status === 'completed' ? 'Tamamlandi' : 'Planlandi'} />
                        </TableCell>
                      </TableRow>
                      {/* Show students when lesson is selected */}
                      {isSelected && selectedLessonStudents.students.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              <Group sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                              Kayitli Ogrenciler ({selectedLessonStudents.students.length})
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {selectedLessonStudents.students.map((student) => (
                                <Chip
                                  key={student._id}
                                  label={`${student.firstName} ${student.lastName}`}
                                  size="small"
                                  variant="outlined"
                                  icon={<Person sx={{ fontSize: 14 }} />}
                                  onClick={(e) => handleLessonReminderClick(e, student, lesson)}
                                  onDelete={(e) => handleLessonReminderClick(e, student, lesson)}
                                  deleteIcon={<Send sx={{ fontSize: 14, color: '#25D366 !important' }} />}
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'primary.light' }
                                  }}
                                />
                              ))}
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                      {isSelected && selectedLessonStudents.students.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="body2" color="text.secondary" align="center">
                              Bu derse kayitli ogrenci bulunamadi
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => { setTodayLessonsDialog({ open: false }); setSelectedLessonStudents({ lessonId: null, students: [] }); }}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Trial Lessons Dialog */}
      <Dialog open={trialLessonsDialog.open} onClose={() => setTrialLessonsDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Bekleyen Deneme Dersleri ({trialLessons.length})</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tarih/Saat</TableCell>
                  <TableCell>Ogrenci</TableCell>
                  <TableCell>Ders</TableCell>
                  <TableCell>Telefon</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trialLessons.map((trial) => (
                  <TableRow key={trial._id} hover>
                    <TableCell>{new Date(trial.scheduledDate).toLocaleDateString('tr-TR')} {trial.scheduledTime}</TableCell>
                    <TableCell>{trial.firstName} {trial.lastName}</TableCell>
                    <TableCell>{trial.course?.name}</TableCell>
                    <TableCell>{trial.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setTrialLessonsDialog({ open: false })}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Instructor Debts Dialog */}
      <Dialog open={instructorDebtsDialog.open} onClose={() => setInstructorDebtsDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Egitmen Borclari</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="h5" color="warning.dark">Toplam Borc: {instructorDebts.total.toLocaleString('tr-TR')} TL</Typography>
          </Box>
          <List>
            {instructorDebts.instructors.map((inst) => (
              <ListItem key={inst._id} button onClick={() => { setInstructorDebtsDialog({ open: false }); navigate(`/instructors/${inst._id}`); }}>
                <ListItemText primary={`${inst.firstName} ${inst.lastName}`} secondary={inst.phone} />
                <Typography variant="h6" color="warning.main">{(inst.balance || 0).toLocaleString('tr-TR')} TL</Typography>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setInstructorDebtsDialog({ open: false })}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Students Dialog */}
      <Dialog open={studentsDialog.open} onClose={() => setStudentsDialog({ open: false, students: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Ogrenci Listesi ({studentsDialog.students.length})</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ogrenci</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">Islem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentsDialog.students.map((student) => (
                  <TableRow key={student._id} hover>
                    <TableCell>{student.firstName} {student.lastName}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell><Chip size="small" color={student.status === 'active' ? 'success' : 'default'} label={student.status === 'active' ? 'Aktif' : 'Pasif'} /></TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setStudentsDialog({ open: false, students: [] }); navigate(`/students/${student._id}`); }}><Visibility /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setStudentsDialog({ open: false, students: [] })}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Payments Detail Dialog */}
      <Dialog open={paymentsDetailDialog.open} onClose={() => setPaymentsDetailDialog({ open: false, title: '', payments: [], type: '' })} maxWidth="md" fullWidth>
        <DialogTitle>{paymentsDetailDialog.title} ({paymentsDetailDialog.payments.length})</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 2, bgcolor: paymentsDetailDialog.type === 'overdue' ? 'error.light' : 'info.light', borderRadius: 1 }}>
            <Typography variant="h6">Toplam: {paymentsDetailDialog.payments.reduce((s, p) => s + p.amount, 0).toLocaleString('tr-TR')} TL</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ogrenci</TableCell>
                  <TableCell>Ders</TableCell>
                  <TableCell>Taksit</TableCell>
                  <TableCell>Vade</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell align="center">Hatırlat</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentsDetailDialog.payments.map((payment, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{payment.student?.firstName} {payment.student?.lastName}</TableCell>
                    <TableCell>{payment.course?.name}</TableCell>
                    <TableCell><Chip size="small" label={`${payment.installmentNumber}. Taksit`} /></TableCell>
                    <TableCell>{new Date(payment.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                    <TableCell align="right">{payment.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleSendPaymentReminder(payment, paymentsDetailDialog.type === 'overdue')}
                        title={paymentsDetailDialog.type === 'overdue' ? 'Gecikmiş ödeme bildirimi' : 'Ödeme hatırlatması'}
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setPaymentsDetailDialog({ open: false, title: '', payments: [], type: '' })}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Discount Students Dialog */}
      <Dialog open={discountStudentsDialog.open} onClose={() => setDiscountStudentsDialog({ open: false, title: '', students: [], discountType: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{discountStudentsDialog.title} ({discountStudentsDialog.students.length})</Typography>
            <IconButton onClick={() => setDiscountStudentsDialog({ open: false, title: '', students: [], discountType: '' })}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {discountStudentsDialog.students.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Bu kategoride öğrenci bulunamadı</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Öğrenci</TableCell>
                    <TableCell>Telefon</TableCell>
                    <TableCell>İndirim Tutarı</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell align="right">İşlem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {discountStudentsDialog.students.map((student) => {
                    // Calculate discount amount for this student
                    const relevantDiscount = student.discounts?.find(d => {
                      if (discountStudentsDialog.discountType === 'fullScholarship') {
                        return d.type === 'fullScholarship';
                      } else {
                        const pValue = d.percentageValue || d.value;
                        const targetPercentage = discountStudentsDialog.discountType.replace('percent_', '');
                        return d.type !== 'fullScholarship' && pValue == targetPercentage;
                      }
                    });
                    const discountAmount = relevantDiscount?.discountAmount || 0;

                    return (
                      <TableRow key={student._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{student.firstName} {student.lastName}</Typography>
                        </TableCell>
                        <TableCell>{student.phone || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            {discountAmount.toLocaleString('tr-TR')} TL
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" color={student.status === 'active' ? 'success' : 'default'} label={student.status === 'active' ? 'Aktif' : 'Pasif'} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => { setDiscountStudentsDialog({ open: false, title: '', students: [], discountType: '' }); navigate(`/students/${student._id}`); }}>
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDiscountStudentsDialog({ open: false, title: '', students: [], discountType: '' })}>Kapat</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
