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
  Checkbox,
  Tabs,
  Tab,
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
  CheckCircleOutline,
  PendingActions,
  Send,
  LocalOffer,
  EventNote,
  Edit,
  Share,
  PushPin,
  Archive,
  Unarchive,
  Timer,
  ViewList,
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
  const [pendingExpensesDialog, setPendingExpensesDialog] = useState({ open: false });

  // Notes state - stored in database
  const [notes, setNotes] = useState([]);
  const [notesDialog, setNotesDialog] = useState({ open: false, editingNote: null });
  const [noteForm, setNoteForm] = useState({ title: '', content: '', priority: 'normal', color: '#ffffff', deadline: '' });
  const [selectedNoteDetail, setSelectedNoteDetail] = useState(null);
  const [shareDialog, setShareDialog] = useState({ open: false, note: null });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedShareUsers, setSelectedShareUsers] = useState([]);
  const [allNotesDialog, setAllNotesDialog] = useState({ open: false, tab: 0 });
  const [archivedNotes, setArchivedNotes] = useState([]);

  // Load notes from API
  const loadNotes = async () => {
    if (!currentUser?._id) return;
    try {
      const response = await api.get(`/notes?userId=${currentUser._id}`);
      setNotes(response.data);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  // Load notes when user is available
  useEffect(() => {
    if (currentUser?._id) {
      loadNotes();
    }
  }, [currentUser?._id]);

  // Load available users for sharing
  const loadAvailableUsers = async () => {
    if (!currentUser?._id) return;
    try {
      const response = await api.get(`/notes/users/available?excludeUserId=${currentUser._id}`);
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Add or update note via API
  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !currentUser?._id) return;

    try {
      const payload = {
        ...noteForm,
        deadline: noteForm.deadline || null,
        userId: currentUser._id
      };
      if (notesDialog.editingNote) {
        await api.put(`/notes/${notesDialog.editingNote._id}`, payload);
      } else {
        await api.post('/notes', {
          ...payload,
          owner: currentUser._id
        });
      }
      await loadNotes();
      setNotesDialog({ open: false, editingNote: null });
      setNoteForm({ title: '', content: '', priority: 'normal', color: '#ffffff', deadline: '' });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  // Delete note via API
  const handleDeleteNote = async (noteId) => {
    if (!currentUser?._id) return;
    try {
      await api.delete(`/notes/${noteId}?userId=${currentUser._id}`);
      await loadNotes();
      setSelectedNoteDetail(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Toggle complete status
  const handleToggleComplete = async (note, e) => {
    if (e) e.stopPropagation();
    if (!currentUser?._id) return;
    try {
      await api.patch(`/notes/${note._id}/complete`, { userId: currentUser._id });
      await loadNotes();
      if (allNotesDialog.open) loadArchivedNotes();
      if (selectedNoteDetail?._id === note._id) {
        setSelectedNoteDetail(prev => ({ ...prev, isCompleted: !prev.isCompleted }));
      }
    } catch (error) {
      console.error('Error toggling complete:', error);
    }
  };

  // Archive note
  const handleArchiveNote = async (noteId) => {
    if (!currentUser?._id) return;
    try {
      await api.patch(`/notes/${noteId}/archive`, { userId: currentUser._id });
      await loadNotes();
      loadArchivedNotes();
      setSelectedNoteDetail(null);
    } catch (error) {
      console.error('Error archiving note:', error);
    }
  };

  // Load archived notes
  const loadArchivedNotes = async () => {
    if (!currentUser?._id) return;
    try {
      const response = await api.get(`/notes/archived?userId=${currentUser._id}`);
      setArchivedNotes(response.data);
    } catch (error) {
      console.error('Error loading archived notes:', error);
    }
  };

  // Helper: check if deadline is approaching (within 3 days)
  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diffMs = dl - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    return 'normal';
  };

  // Toggle pin status
  const handleTogglePin = async (note) => {
    if (!currentUser?._id) return;
    try {
      await api.patch(`/notes/${note._id}/pin`, { userId: currentUser._id });
      await loadNotes();
      if (selectedNoteDetail?._id === note._id) {
        setSelectedNoteDetail({ ...selectedNoteDetail, isPinned: !selectedNoteDetail.isPinned });
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Open share dialog
  const handleOpenShareDialog = async (note) => {
    await loadAvailableUsers();
    setSelectedShareUsers(note.sharedWith?.map(u => u._id) || []);
    setShareDialog({ open: true, note });
  };

  // Save sharing settings
  const handleSaveShare = async () => {
    if (!shareDialog.note || !currentUser?._id) return;
    try {
      await api.post(`/notes/${shareDialog.note._id}/share`, {
        userId: currentUser._id,
        shareWithUserIds: selectedShareUsers
      });
      await loadNotes();
      setShareDialog({ open: false, note: null });
      setSelectedShareUsers([]);
    } catch (error) {
      console.error('Error sharing note:', error);
    }
  };

  // Open edit dialog
  const handleEditNote = (note) => {
    setNoteForm({
      title: note.title,
      content: note.content,
      priority: note.priority || 'normal',
      color: note.color || '#ffffff',
      deadline: note.deadline ? new Date(note.deadline).toISOString().split('T')[0] : ''
    });
    setNotesDialog({ open: true, editingNote: note });
  };

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
        params: { seasonId: season._id, isActive: true, excludeInactiveStudents: true, populate: 'student' }
      });
      setAllEnrollments(response.data);
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  };

  const loadPendingExpenses = async () => {
    try {
      // No days limit - get all pending expenses for proper totals
      const response = await api.get('/recurring-expenses/pending/list', {
        params: { institution: institution._id, season: season._id }
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
        api.get('/enrollments', { params: { seasonId: season._id, isActive: true, excludeInactiveStudents: true } })
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
                  <Typography variant="caption" color="text.secondary">Kayıtlı Öğrenci</Typography>
                </Box>
              </Box>
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
                  • Bek. Tahsilat: <span style={{ color: '#ff9800' }}>{(upcomingPayments.season?.total || 0).toLocaleString('tr-TR')}₺</span>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                  • Bek. Gider: <span style={{ color: '#f44336' }}>{(pendingExpenses.totals?.totalAmount || 0).toLocaleString('tr-TR')}₺</span>
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
        {canSeeExpenses && (() => {
          // Get all expenses sorted by due date for the nearest 5
          const allExpensesList = [
            ...(pendingExpenses.overdue || []),
            ...(pendingExpenses.thisWeek || []),
            ...(pendingExpenses.upcoming || []),
            ...(pendingExpenses.nextMonth || []),
            ...(pendingExpenses.next3Months || []),
            ...(pendingExpenses.next6Months || []),
            ...(pendingExpenses.later || []),
          ].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);

          // This month total (overdue + thisWeek + upcoming + nextMonth roughly = 30 days)
          const thisMonthAmount = (pendingExpenses.totals?.overdueAmount || 0) +
            (pendingExpenses.totals?.thisWeekAmount || 0) +
            (pendingExpenses.totals?.upcomingAmount || 0) +
            (pendingExpenses.totals?.nextMonthAmount || 0);
          const thisMonthCount = (pendingExpenses.totals?.overdueCount || 0) +
            (pendingExpenses.totals?.thisWeekCount || 0) +
            (pendingExpenses.totals?.upcomingCount || 0) +
            (pendingExpenses.totals?.nextMonthCount || 0);

          return (
            <Grid item xs={6} sm={6} md={2}>
              <Paper
                sx={{
                  p: 1,
                  cursor: 'pointer',
                  height: '100%',
                  minHeight: 160,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: pendingExpenses.totals?.overdueCount > 0 ? 'error.light' :
                           pendingExpenses.totals?.thisWeekCount > 0 ? 'warning.light' : 'grey.100',
                  '&:hover': { opacity: 0.9 }
                }}
                onClick={() => setPendingExpensesDialog({ open: true })}
              >
                {/* Top: Bu Ay Bekleyen */}
                <Box sx={{ textAlign: 'center', pb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {pendingExpenses.totals?.overdueCount > 0 ? (
                      <Warning sx={{ fontSize: 18, color: 'error.dark' }} />
                    ) : (
                      <Schedule sx={{ fontSize: 18, color: 'text.secondary' }} />
                    )}
                    <Typography variant="subtitle1" fontWeight="bold">
                      {thisMonthAmount.toLocaleString('tr-TR')}₺
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">Bu Ay ({thisMonthCount})</Typography>
                </Box>

                <Divider />

                {/* Middle: Nearest 5 expenses */}
                <Box sx={{ flex: 1, overflow: 'auto', py: 0.5, '&::-webkit-scrollbar': { width: 2 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 2 } }}>
                  {allExpensesList.length > 0 ? allExpensesList.map((exp, idx) => {
                    const isOverdue = exp.status === 'overdue';
                    const dueDate = new Date(exp.dueDate);
                    return (
                      <Box key={exp._id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.25, borderBottom: idx < allExpensesList.length - 1 ? '1px dashed #ddd' : 'none' }}>
                        <Typography variant="caption" sx={{ color: isOverdue ? 'error.dark' : 'text.primary', fontWeight: isOverdue ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                          {exp.category}
                        </Typography>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: isOverdue ? 'error.dark' : 'text.primary' }}>
                            {exp.amount?.toLocaleString('tr-TR')}₺
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', color: isOverdue ? 'error.main' : 'text.secondary' }}>
                            {dueDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }) : (
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 1, color: 'success.main' }}>
                      Bekleyen gider yok
                    </Typography>
                  )}
                </Box>

                <Divider />

                {/* Bottom: Toplam Bekleyen */}
                <Box sx={{ textAlign: 'center', pt: 0.5, bgcolor: 'rgba(0,0,0,0.05)', mx: -1, mb: -1, px: 1, pb: 0.5, borderRadius: '0 0 4px 4px' }}>
                  <Typography variant="caption" color="text.secondary">Toplam Bekleyen</Typography>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary.dark">
                    {(pendingExpenses.totals?.totalAmount || 0).toLocaleString('tr-TR')}₺ ({pendingExpenses.totals?.totalCount || 0})
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })()}

        {/* Notes Widget */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 1.5, height: '100%', minHeight: 160, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                <EventNote sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 18 }} />
                Notlarım
              </Typography>
              <Box>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    setNoteForm({ title: '', content: '', priority: 'normal', color: '#ffffff', deadline: '' });
                    setNotesDialog({ open: true, editingNote: null });
                  }}
                  title="Yeni Not"
                >
                  <Add fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {notes.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
                  Henüz not eklenmedi
                </Typography>
              ) : (
                notes.filter(n => !n.isCompleted).slice(0, 5).map((note) => {
                  const isOwner = note.owner?._id === currentUser?._id;
                  const isShared = note.sharedWith?.length > 0;
                  const dlStatus = getDeadlineStatus(note.deadline);
                  return (
                    <Box
                      key={note._id}
                      sx={{
                        p: 0.75,
                        mb: 0.5,
                        bgcolor: dlStatus === 'overdue' ? 'error.50' : dlStatus === 'urgent' ? 'warning.50' : note.isPinned ? 'warning.lighter' : (note.color !== '#ffffff' ? note.color : 'grey.100'),
                        borderRadius: 1,
                        cursor: 'pointer',
                        borderLeft: note.priority === 'high' ? '3px solid' : 'none',
                        borderLeftColor: 'error.main',
                        '&:hover': { bgcolor: note.isPinned ? 'warning.light' : 'grey.200' },
                        ...(dlStatus === 'urgent' || dlStatus === 'overdue' ? {
                          animation: 'deadlinePulse 2s ease-in-out infinite',
                          '@keyframes deadlinePulse': {
                            '0%': { borderRightColor: 'transparent' },
                            '50%': { borderRightColor: '#d32f2f' },
                            '100%': { borderRightColor: 'transparent' }
                          },
                          borderRight: '3px solid transparent'
                        } : {})
                      }}
                      onClick={() => setSelectedNoteDetail(note)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Checkbox
                          size="small"
                          checked={!!note.isCompleted}
                          onClick={(e) => handleToggleComplete(note, e)}
                          sx={{ p: 0, mr: 0.25 }}
                        />
                        {note.isPinned && <PushPin sx={{ fontSize: 12, color: 'warning.main' }} />}
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          noWrap
                          sx={{
                            flex: 1,
                            textDecoration: note.isCompleted ? 'line-through' : 'none',
                            opacity: note.isCompleted ? 0.6 : 1
                          }}
                        >
                          {note.title}
                        </Typography>
                        {isShared && <Share sx={{ fontSize: 12, color: 'info.main' }} />}
                        {(dlStatus === 'urgent' || dlStatus === 'overdue') && (
                          <Tooltip title={dlStatus === 'overdue' ? 'Süresi doldu!' : 'Süre doluyor!'}>
                            <Timer sx={{ fontSize: 14, color: 'error.main' }} />
                          </Tooltip>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {!isOwner && note.owner?.fullName ? `${note.owner.fullName} · ` : ''}
                          {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                        </Typography>
                        {note.deadline && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: dlStatus === 'overdue' ? 'error.main' : dlStatus === 'urgent' ? 'warning.main' : 'text.secondary',
                              fontWeight: dlStatus === 'urgent' || dlStatus === 'overdue' ? 'bold' : 'normal'
                            }}
                          >
                            {dlStatus === 'overdue' ? ' · Gecikti!' : dlStatus === 'urgent' ? ' · Süre doluyor!' : ''}
                            {' · Son: ' + new Date(note.deadline).toLocaleDateString('tr-TR')}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
              {(notes.filter(n => !n.isCompleted).length > 5 || notes.some(n => n.isCompleted)) && (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ cursor: 'pointer', textAlign: 'center', display: 'block', mt: 0.5, '&:hover': { textDecoration: 'underline' } }}
                  onClick={() => {
                    loadArchivedNotes();
                    setAllNotesDialog({ open: true, tab: 0 });
                  }}
                >
                  <ViewList sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                  Tümünü Gör ({notes.length} not)
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

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
              {pendingExpenses.overdue?.length > 0 && (
                <ListItem button onClick={() => navigate('/recurring-expenses')} sx={{ bgcolor: 'error.light', borderRadius: 1, mb: 0.5 }}>
                  <ListItemIcon><AttachMoney color="error" /></ListItemIcon>
                  <ListItemText
                    primary={<Typography color="error.dark" fontWeight="bold">{pendingExpenses.overdue.length} Gecikmis Gider</Typography>}
                    secondary={`${pendingExpenses.totals?.overdueAmount?.toLocaleString('tr-TR') || 0} TL`}
                  />
                </ListItem>
              )}
              {pendingExpenses.thisWeek?.length > 0 && (
                <ListItem button onClick={() => navigate('/recurring-expenses')} sx={{ bgcolor: 'warning.light', borderRadius: 1, mb: 0.5 }}>
                  <ListItemIcon><AttachMoney color="warning" /></ListItemIcon>
                  <ListItemText
                    primary={<Typography color="warning.dark" fontWeight="bold">{pendingExpenses.thisWeek.length} Bu Hafta Vadeli Gider</Typography>}
                    secondary={`${pendingExpenses.totals?.thisWeekAmount?.toLocaleString('tr-TR') || 0} TL`}
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
              {upcomingPayments.overdue.items.length === 0 && upcomingPayments.today.items.length === 0 && trialLessons.length === 0 && instructorDebts.total === 0 && pendingExpenses.overdue?.length === 0 && pendingExpenses.thisWeek?.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>Acil durum yok</Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Third Row - Course Capacity & Trial Lessons */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2 }}><School sx={{ mr: 1, verticalAlign: 'middle' }} />Ders Doluluk Durumu</Typography>
            {courseStats.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Ders bulunamadı</Typography>
            ) : (
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {courseStats.map((course) => {
                  const occupancyColor = getOccupancyColor(course.percentage);
                  return (
                    <Box key={course._id} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>{course.name}</Typography>
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

      {/* Pending Expenses Dialog */}
      <Dialog open={pendingExpensesDialog.open} onClose={() => setPendingExpensesDialog({ open: false })} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Bekleyen Giderler ({pendingExpenses.totals?.totalCount || 0})</Typography>
            <Box>
              <Button size="small" onClick={() => { setPendingExpensesDialog({ open: false }); navigate('/expenses'); }}>
                Giderler Sayfasına Git
              </Button>
              <IconButton onClick={() => setPendingExpensesDialog({ open: false })}><Close /></IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Summary Cards */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {[
              { key: 'overdue', label: 'Gecikmiş', color: 'error', count: pendingExpenses.totals?.overdueCount, amount: pendingExpenses.totals?.overdueAmount },
              { key: 'thisWeek', label: 'Bu Hafta (7 gün)', color: 'warning', count: pendingExpenses.totals?.thisWeekCount, amount: pendingExpenses.totals?.thisWeekAmount },
              { key: 'upcoming', label: 'Yaklaşan (15 gün)', color: 'info', count: pendingExpenses.totals?.upcomingCount, amount: pendingExpenses.totals?.upcomingAmount },
              { key: 'nextMonth', label: 'Bu Ay (30 gün)', color: 'secondary', count: pendingExpenses.totals?.nextMonthCount, amount: pendingExpenses.totals?.nextMonthAmount },
              { key: 'next3Months', label: '3 Ay', color: 'primary', count: pendingExpenses.totals?.next3MonthsCount, amount: pendingExpenses.totals?.next3MonthsAmount },
              { key: 'next6Months', label: '6 Ay', color: 'default', count: pendingExpenses.totals?.next6MonthsCount, amount: pendingExpenses.totals?.next6MonthsAmount },
            ].map(({ key, label, color, count, amount }) => (
              <Grid item xs={4} sm={2} key={key}>
                <Paper sx={{ p: 1, textAlign: 'center', bgcolor: color === 'default' ? 'grey.200' : `${color}.light` }}>
                  <Typography variant="caption" color={color === 'default' ? 'text.secondary' : `${color}.dark`}>{label}</Typography>
                  <Typography variant="h6" color={color === 'default' ? 'text.primary' : `${color}.dark`} fontWeight="bold">{count || 0}</Typography>
                  <Typography variant="caption" color={color === 'default' ? 'text.secondary' : `${color}.dark`}>{(amount || 0).toLocaleString('tr-TR')}₺</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Total Summary */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'primary.main', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="subtitle2" color="white">Toplam Bekleyen Gider</Typography>
            <Typography variant="h5" color="white" fontWeight="bold">
              {(pendingExpenses.totals?.totalAmount || 0).toLocaleString('tr-TR')} TL
            </Typography>
          </Box>

          {/* Expense List */}
          {pendingExpenses.totals?.totalCount > 0 ? (
            <TableContainer sx={{ maxHeight: 350 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Açıklama</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell>Vade Tarihi</TableCell>
                    <TableCell>Dönem</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Overdue expenses first */}
                  {pendingExpenses.overdue?.map((expense) => (
                    <TableRow key={expense._id} sx={{ bgcolor: 'error.lighter' }}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" color="error" label="Gecikmiş" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                  {/* This week expenses */}
                  {pendingExpenses.thisWeek?.map((expense) => (
                    <TableRow key={expense._id} sx={{ bgcolor: 'warning.lighter' }}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" color="warning" label="Bu Hafta" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                  {/* Upcoming (15 days) */}
                  {pendingExpenses.upcoming?.map((expense) => (
                    <TableRow key={expense._id} sx={{ bgcolor: 'info.lighter' }}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" color="info" label="Yaklaşan" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                  {/* Next month */}
                  {pendingExpenses.nextMonth?.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" color="secondary" label="Bu Ay" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                  {/* Next 3 months */}
                  {pendingExpenses.next3Months?.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" color="primary" label="3 Ay" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                  {/* Next 6 months */}
                  {pendingExpenses.next6Months?.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" label="6 Ay" /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                  {/* Later */}
                  {pendingExpenses.later?.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell><Chip size="small" label={expense.category} /></TableCell>
                      <TableCell>{new Date(expense.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                      <TableCell><Chip size="small" label="6+ Ay" sx={{ bgcolor: 'grey.300' }} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{expense.amount?.toLocaleString('tr-TR')} TL</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 3 }}>Bekleyen gider bulunmuyor</Typography>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setPendingExpensesDialog({ open: false })}>Kapat</Button></DialogActions>
      </Dialog>

      {/* Notes Add/Edit Dialog */}
      <Dialog open={notesDialog.open} onClose={() => setNotesDialog({ open: false, editingNote: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{notesDialog.editingNote ? 'Notu Düzenle' : 'Yeni Not / Görev'}</Typography>
            <IconButton onClick={() => setNotesDialog({ open: false, editingNote: null })}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Başlık"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Not İçeriği"
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            multiline
            rows={4}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Öncelik</InputLabel>
              <Select
                value={noteForm.priority}
                label="Öncelik"
                onChange={(e) => setNoteForm({ ...noteForm, priority: e.target.value })}
              >
                <MenuItem value="low">Düşük</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">Yüksek</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="Son Tarih"
              value={noteForm.deadline}
              onChange={(e) => setNoteForm({ ...noteForm, deadline: e.target.value })}
              size="small"
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          {/* Quick deadline buttons */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: '24px' }}>Hızlı:</Typography>
            {[1, 2, 3, 5, 7, 10].map(days => {
              const d = new Date();
              d.setDate(d.getDate() + days);
              const val = d.toISOString().split('T')[0];
              return (
                <Chip
                  key={days}
                  label={`${days} gün`}
                  size="small"
                  variant={noteForm.deadline === val ? 'filled' : 'outlined'}
                  color={noteForm.deadline === val ? 'primary' : 'default'}
                  onClick={() => setNoteForm({ ...noteForm, deadline: val })}
                  sx={{ cursor: 'pointer' }}
                />
              );
            })}
            {noteForm.deadline && (
              <Chip
                label="Kaldır"
                size="small"
                color="error"
                variant="outlined"
                onDelete={() => setNoteForm({ ...noteForm, deadline: '' })}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotesDialog({ open: false, editingNote: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSaveNote} disabled={!noteForm.title.trim()}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNoteDetail} onClose={() => setSelectedNoteDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {selectedNoteDetail?.isPinned && <PushPin color="warning" fontSize="small" />}
              <Typography variant="h6" noWrap sx={{ textDecoration: selectedNoteDetail?.isCompleted ? 'line-through' : 'none' }}>
                {selectedNoteDetail?.title}
              </Typography>
              {selectedNoteDetail?.priority === 'high' && <Chip size="small" color="error" label="Yüksek" />}
              {selectedNoteDetail?.isCompleted && <Chip size="small" color="success" label="Tamamlandı" />}
            </Box>
            <Box sx={{ display: 'flex', flexShrink: 0 }}>
              {/* Toggle complete - available to owner and shared users */}
              <Tooltip title={selectedNoteDetail?.isCompleted ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}>
                <IconButton
                  size="small"
                  color={selectedNoteDetail?.isCompleted ? 'success' : 'default'}
                  onClick={() => handleToggleComplete(selectedNoteDetail)}
                >
                  {selectedNoteDetail?.isCompleted ? <CheckCircle /> : <CheckCircleOutline />}
                </IconButton>
              </Tooltip>
              {selectedNoteDetail?.owner?._id === currentUser?._id && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => handleTogglePin(selectedNoteDetail)}
                    title={selectedNoteDetail?.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                    color={selectedNoteDetail?.isPinned ? 'warning' : 'default'}
                  >
                    <PushPin />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenShareDialog(selectedNoteDetail)}
                    title="Paylaş"
                    color={selectedNoteDetail?.sharedWith?.length > 0 ? 'info' : 'default'}
                  >
                    <Share />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      handleEditNote(selectedNoteDetail);
                      setSelectedNoteDetail(null);
                    }}
                    title="Düzenle"
                  >
                    <Edit />
                  </IconButton>
                  <Tooltip title="Arşivle">
                    <IconButton
                      size="small"
                      onClick={() => handleArchiveNote(selectedNoteDetail._id)}
                    >
                      <Archive />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteNote(selectedNoteDetail._id)}
                    title="Sil"
                  >
                    <Delete />
                  </IconButton>
                </>
              )}
              <IconButton onClick={() => setSelectedNoteDetail(null)}><Close /></IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            {selectedNoteDetail?.owner?._id !== currentUser?._id && (
              <Typography variant="caption" color="info.main" sx={{ display: 'block', mb: 0.5 }}>
                Paylaşan: {selectedNoteDetail?.owner?.fullName}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Oluşturulma: {selectedNoteDetail && new Date(selectedNoteDetail.createdAt).toLocaleString('tr-TR')}
            </Typography>
            {selectedNoteDetail?.deadline && (() => {
              const dlStatus = getDeadlineStatus(selectedNoteDetail.deadline);
              return (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block', mt: 0.25,
                    color: dlStatus === 'overdue' ? 'error.main' : dlStatus === 'urgent' ? 'warning.main' : 'text.secondary',
                    fontWeight: dlStatus !== 'normal' ? 'bold' : 'normal'
                  }}
                >
                  <Timer sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                  Son Tarih: {new Date(selectedNoteDetail.deadline).toLocaleDateString('tr-TR')}
                  {dlStatus === 'overdue' && ' - Süresi doldu!'}
                  {dlStatus === 'urgent' && ' - Süre doluyor!'}
                </Typography>
              );
            })()}
            {selectedNoteDetail?.isCompleted && selectedNoteDetail?.completedAt && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.25 }}>
                Tamamlanma: {new Date(selectedNoteDetail.completedAt).toLocaleString('tr-TR')}
              </Typography>
            )}
            {selectedNoteDetail?.sharedWith?.length > 0 && selectedNoteDetail?.owner?._id === currentUser?._id && (
              <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5 }}>
                Paylaşılan: {selectedNoteDetail.sharedWith.map(u => u.fullName).join(', ')}
              </Typography>
            )}
          </Box>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {selectedNoteDetail?.content || 'İçerik yok'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedNoteDetail(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Share Note Dialog */}
      <Dialog open={shareDialog.open} onClose={() => setShareDialog({ open: false, note: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notu Paylaş: {shareDialog.note?.title}</Typography>
            <IconButton onClick={() => setShareDialog({ open: false, note: null })}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bu notu görebilecek kullanıcıları seçin:
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Kullanıcılar</InputLabel>
            <Select
              multiple
              value={selectedShareUsers}
              label="Kullanıcılar"
              onChange={(e) => setSelectedShareUsers(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((userId) => {
                    const user = availableUsers.find(u => u._id === userId);
                    return <Chip key={userId} size="small" label={user?.fullName || userId} />;
                  })}
                </Box>
              )}
            >
              {availableUsers.map((user) => (
                <MenuItem key={user._id} value={user._id}>
                  {user.fullName} ({user.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {availableUsers.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Paylaşılabilecek başka kullanıcı bulunamadı
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog({ open: false, note: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSaveShare}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* All Notes Dialog (Tümünü Gör) */}
      <Dialog
        open={allNotesDialog.open}
        onClose={() => setAllNotesDialog({ open: false, tab: 0 })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Tüm Notlar & Görevler</Typography>
            <Box>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setNoteForm({ title: '', content: '', priority: 'normal', color: '#ffffff', deadline: '' });
                  setNotesDialog({ open: true, editingNote: null });
                }}
                title="Yeni Not"
              >
                <Add />
              </IconButton>
              <IconButton onClick={() => setAllNotesDialog({ open: false, tab: 0 })}><Close /></IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 0 }}>
          <Tabs
            value={allNotesDialog.tab}
            onChange={(e, v) => setAllNotesDialog(prev => ({ ...prev, tab: v }))}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, px: 2 }}
          >
            <Tab label={`Aktif (${notes.filter(n => !n.isCompleted).length})`} />
            <Tab label={`Tamamlanan (${notes.filter(n => n.isCompleted).length})`} />
            <Tab label={`Arşiv (${archivedNotes.length})`} />
          </Tabs>
          <Box sx={{ px: 2, maxHeight: 500, overflow: 'auto' }}>
            {(() => {
              let displayNotes = [];
              if (allNotesDialog.tab === 0) displayNotes = notes.filter(n => !n.isCompleted);
              else if (allNotesDialog.tab === 1) displayNotes = notes.filter(n => n.isCompleted);
              else displayNotes = archivedNotes;

              if (displayNotes.length === 0) {
                return (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    {allNotesDialog.tab === 0 ? 'Aktif not yok' : allNotesDialog.tab === 1 ? 'Tamamlanan not yok' : 'Arşivde not yok'}
                  </Typography>
                );
              }

              return displayNotes.map((note) => {
                const isOwner = note.owner?._id === currentUser?._id;
                const dlStatus = getDeadlineStatus(note.deadline);
                return (
                  <Box
                    key={note._id}
                    sx={{
                      p: 1.5,
                      mb: 1,
                      bgcolor: note.isCompleted ? 'grey.50' : dlStatus === 'overdue' ? 'error.50' : dlStatus === 'urgent' ? 'warning.50' : note.isPinned ? 'warning.lighter' : 'grey.50',
                      borderRadius: 1,
                      borderLeft: note.priority === 'high' ? '4px solid' : '4px solid transparent',
                      borderLeftColor: note.priority === 'high' ? 'error.main' : 'transparent',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      '&:hover': { bgcolor: 'grey.100' }
                    }}
                  >
                    {allNotesDialog.tab !== 2 && (
                      <Checkbox
                        size="small"
                        checked={!!note.isCompleted}
                        onClick={(e) => handleToggleComplete(note, e)}
                        sx={{ mt: -0.25 }}
                      />
                    )}
                    <Box
                      sx={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                      onClick={() => {
                        setSelectedNoteDetail(note);
                        setAllNotesDialog({ open: false, tab: allNotesDialog.tab });
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        {note.isPinned && <PushPin sx={{ fontSize: 14, color: 'warning.main' }} />}
                        <Typography
                          variant="body1"
                          fontWeight="medium"
                          sx={{
                            textDecoration: note.isCompleted ? 'line-through' : 'none',
                            opacity: note.isCompleted ? 0.6 : 1
                          }}
                        >
                          {note.title}
                        </Typography>
                        {note.sharedWith?.length > 0 && <Share sx={{ fontSize: 14, color: 'info.main' }} />}
                        {(dlStatus === 'urgent' || dlStatus === 'overdue') && !note.isCompleted && (
                          <Chip
                            size="small"
                            icon={<Timer sx={{ fontSize: 14 }} />}
                            label={dlStatus === 'overdue' ? 'Gecikti!' : 'Süre doluyor!'}
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.25, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {!isOwner && note.owner?.fullName ? `${note.owner.fullName} · ` : ''}
                          {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                        </Typography>
                        {note.deadline && (
                          <Typography variant="caption" sx={{ color: dlStatus === 'overdue' ? 'error.main' : dlStatus === 'urgent' ? 'warning.main' : 'text.secondary' }}>
                            Son: {new Date(note.deadline).toLocaleDateString('tr-TR')}
                          </Typography>
                        )}
                        {note.isCompleted && note.completedAt && (
                          <Typography variant="caption" color="success.main">
                            Tamamlandı: {new Date(note.completedAt).toLocaleDateString('tr-TR')}
                          </Typography>
                        )}
                      </Box>
                      {note.content && (
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                          {note.content}
                        </Typography>
                      )}
                    </Box>
                    {isOwner && (
                      <Box sx={{ display: 'flex', flexShrink: 0 }}>
                        {allNotesDialog.tab === 2 ? (
                          <Tooltip title="Arşivden Çıkar">
                            <IconButton size="small" onClick={() => handleArchiveNote(note._id)}>
                              <Unarchive fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Arşivle">
                            <IconButton size="small" onClick={() => handleArchiveNote(note._id)}>
                              <Archive fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error" onClick={() => handleDeleteNote(note._id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                );
              });
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllNotesDialog({ open: false, tab: 0 })}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
