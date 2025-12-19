import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Chip,
  Card,
  CardContent,
  Fab,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Tooltip,
  Divider,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  FormLabel,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Payment,
  Repeat,
  Warning,
  CheckCircle,
  Schedule,
  CalendarMonth,
  TrendingUp,
  FileDownload,
  History,
  EventNote,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { exportExpenses } from '../utils/exportHelpers';

const EXPENSE_CATEGORIES = [
  'Kira',
  'Elektrik',
  'Su',
  'Doğalgaz',
  'İnternet',
  'Telefon',
  'Kırtasiye',
  'Temizlik Malzemeleri',
  'Dekorasyon ve Sahne Malzemeleri',
  'Kostüm ve Aksesuar',
  'Eğitmen Ödemesi',
  'KDV',
  'Kredi Kartı Komisyonu',
  'Ödeme İadesi',
  'Çay/Kahve',
  'Yemek',
  'Ulaşım',
  'Sigorta',
  'Reklam ve Tanıtım',
  'Web Hosting/Domain',
  'Yazılım Lisansı',
  'Müzik/Ses Sistemi',
  'Işık Ekipmanları',
  'Kamera/Fotoğraf',
  'Ofis Malzemeleri',
  'Bakım Onarım',
  'Vergi',
  'Muhasebe',
  'Hukuk',
  'Danışmanlık',
  'Sahne Malzemeleri',
  'Etkinlik Gideri',
  'Eğitim Materyali',
  'Maaş',
  'Malzeme',
  'Temizlik',
  'Diğer',
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Aylık' },
  { value: 'quarterly', label: '3 Aylık' },
  { value: 'yearly', label: 'Yıllık' },
];

const Expenses = () => {
  const { institution, season, currentUser, user } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState([]); // Paid expenses (history)
  const [pendingExpenses, setPendingExpenses] = useState({ overdue: [], thisWeek: [], upcoming: [], totals: {} });
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter
  const [filterCategory, setFilterCategory] = useState('all');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openRecurringDialog, setOpenRecurringDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openDeleteExpense, setOpenDeleteExpense] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Form data for one-time expense
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    expenseDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    cashRegister: '',
    instructor: '',
    status: 'paid', // 'paid' or 'pending'
    showInCalendar: false,
    notes: '',
  });

  // Form data for recurring expense template
  const [recurringFormData, setRecurringFormData] = useState({
    title: '',
    category: '',
    description: '',
    amountType: 'fixed',
    estimatedAmount: '',
    frequency: 'monthly',
    dueDayType: 'fixed',
    dueDay: 1,
    dueDayRangeStart: 1,
    dueDayRangeEnd: 5,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    defaultCashRegister: '',
    instructor: '',
    isActive: true,
    notes: '',
  });

  // Pay form data
  const [payFormData, setPayFormData] = useState({
    amount: '',
    cashRegisterId: '',
    notes: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  // Generate form data
  const [generateFormData, setGenerateFormData] = useState({
    startDate: '',
    endDate: '',
  });

  // Delete expense dialog
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    expense: null,
    password: '',
  });

  useEffect(() => {
    if (institution && season) {
      loadData();
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesRes, pendingRes, recurringRes, cashRes, instructorsRes] = await Promise.all([
        api.get('/expenses', {
          params: { institution: institution._id, season: season._id },
        }),
        api.get('/recurring-expenses/pending/list', {
          params: { institution: institution._id, season: season._id },  // No days limit - show all pending
        }),
        api.get('/recurring-expenses', {
          params: { institution: institution._id, season: season._id },
        }),
        api.get('/cash-registers', {
          params: { institution: institution._id },
        }),
        api.get('/instructors', {
          params: { institutionId: institution._id, seasonId: season._id },
        }),
      ]);

      // Filter only paid expenses for history
      setExpenses(expensesRes.data.filter(e => e.status === 'paid'));
      setPendingExpenses(pendingRes.data);
      setRecurringExpenses(recurringRes.data);
      setCashRegisters(cashRes.data);
      setInstructors(instructorsRes.data);

      if (cashRes.data.length > 0) {
        setFormData(prev => ({ ...prev, cashRegister: cashRes.data[0]._id }));
        setRecurringFormData(prev => ({ ...prev, defaultCashRegister: cashRes.data[0]._id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // === One-time Expense Functions ===
  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        description: expense.description || '',
        amount: expense.amount || '',
        category: expense.category || '',
        expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : '',
        dueDate: expense.dueDate ? expense.dueDate.split('T')[0] : '',
        cashRegister: expense.cashRegister?._id || '',
        instructor: expense.instructor?._id || '',
        status: expense.status || 'paid',
        showInCalendar: expense.showInCalendar || false,
        notes: expense.notes || '',
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        description: '',
        amount: '',
        category: '',
        expenseDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        cashRegister: cashRegisters[0]?._id || '',
        instructor: '',
        status: 'paid',
        showInCalendar: false,
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedExpense(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const expenseData = {
        ...formData,
        institution: institution._id,
        season: season._id,
        amount: parseFloat(formData.amount),
        createdBy: currentUser?.username || user,
        updatedBy: currentUser?.username || user,
      };

      // If pending, don't require cashRegister and set dueDate
      if (formData.status === 'pending') {
        if (!formData.dueDate) {
          setError('Vadeli gider için vade tarihi zorunludur');
          return;
        }
        expenseData.dueDate = formData.dueDate;
        delete expenseData.cashRegister;
      }

      if (selectedExpense) {
        await api.put(`/expenses/${selectedExpense._id}`, expenseData);
        setSuccess('Gider güncellendi');
      } else {
        await api.post('/expenses', expenseData);
        setSuccess(formData.status === 'paid' ? 'Gider kaydedildi' : 'Vadeli gider oluşturuldu');
      }

      await loadData();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    }
  };

  // === Recurring Expense Functions ===
  const handleOpenRecurringDialog = (recurring = null) => {
    if (recurring) {
      setSelectedRecurring(recurring);
      setRecurringFormData({
        title: recurring.title || '',
        category: recurring.category || '',
        description: recurring.description || '',
        amountType: recurring.amountType || 'fixed',
        estimatedAmount: recurring.estimatedAmount || '',
        frequency: recurring.frequency || 'monthly',
        dueDayType: recurring.dueDayType || 'fixed',
        dueDay: recurring.dueDay || 1,
        dueDayRangeStart: recurring.dueDayRangeStart || 1,
        dueDayRangeEnd: recurring.dueDayRangeEnd || 5,
        startDate: recurring.startDate ? recurring.startDate.split('T')[0] : '',
        endDate: recurring.endDate ? recurring.endDate.split('T')[0] : '',
        defaultCashRegister: recurring.defaultCashRegister?._id || '',
        instructor: recurring.instructor?._id || '',
        isActive: recurring.isActive !== false,
        notes: recurring.notes || '',
      });
    } else {
      setSelectedRecurring(null);
      setRecurringFormData({
        title: '',
        category: '',
        description: '',
        amountType: 'fixed',
        estimatedAmount: '',
        frequency: 'monthly',
        dueDayType: 'fixed',
        dueDay: 1,
        dueDayRangeStart: 1,
        dueDayRangeEnd: 5,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        defaultCashRegister: cashRegisters[0]?._id || '',
        instructor: '',
        isActive: true,
        notes: '',
      });
    }
    setOpenRecurringDialog(true);
  };

  const handleCloseRecurringDialog = () => {
    setOpenRecurringDialog(false);
    setSelectedRecurring(null);
  };

  const handleSubmitRecurring = async () => {
    try {
      const data = {
        ...recurringFormData,
        institution: institution._id,
        season: season._id,
        estimatedAmount: parseFloat(recurringFormData.estimatedAmount),
        dueDay: parseInt(recurringFormData.dueDay),
        dueDayRangeStart: parseInt(recurringFormData.dueDayRangeStart),
        dueDayRangeEnd: parseInt(recurringFormData.dueDayRangeEnd),
      };

      if (!data.endDate) delete data.endDate;
      if (!data.defaultCashRegister) delete data.defaultCashRegister;
      if (!data.instructor) delete data.instructor;

      if (selectedRecurring) {
        await api.put(`/recurring-expenses/${selectedRecurring._id}`, data);
        setSuccess('Düzenli gider güncellendi');
      } else {
        const response = await api.post('/recurring-expenses', data);
        const generatedCount = response.data.generatedCount || 0;
        setSuccess(`Düzenli gider oluşturuldu ve ${generatedCount} gider kaydı oluşturuldu`);
      }

      handleCloseRecurringDialog();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDeleteRecurring = async () => {
    try {
      const response = await api.delete(`/recurring-expenses/${selectedRecurring._id}`);
      setSuccess(response.data.message);
      setOpenConfirm(false);
      setSelectedRecurring(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme başarısız');
    }
  };

  // === Pay Dialog Functions ===
  const handleOpenPayDialog = (expense) => {
    setSelectedExpense(expense);
    setPayFormData({
      amount: expense.amount || expense.estimatedAmount || '',
      cashRegisterId: expense.recurringExpense?.defaultCashRegister || cashRegisters[0]?._id || '',
      notes: '',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setOpenPayDialog(true);
  };

  const handlePay = async () => {
    try {
      await api.post(`/recurring-expenses/pay/${selectedExpense._id}`, {
        ...payFormData,
        amount: parseFloat(payFormData.amount),
      });
      setSuccess('Ödeme kaydedildi');
      setOpenPayDialog(false);
      setSelectedExpense(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Ödeme başarısız');
    }
  };

  // === Generate Dialog Functions ===
  const handleOpenGenerateDialog = (recurring) => {
    setSelectedRecurring(recurring);
    const defaultEndDate = recurring.endDate
      ? recurring.endDate.split('T')[0]
      : new Date(new Date(recurring.startDate).getFullYear() + 1, new Date(recurring.startDate).getMonth(), new Date(recurring.startDate).getDate()).toISOString().split('T')[0];
    setGenerateFormData({
      startDate: recurring.startDate ? recurring.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: defaultEndDate,
    });
    setOpenGenerateDialog(true);
  };

  const handleGenerate = async () => {
    try {
      const res = await api.post(`/recurring-expenses/${selectedRecurring._id}/generate`, generateFormData);
      setSuccess(res.data.message);
      setOpenGenerateDialog(false);
      setSelectedRecurring(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Gider oluşturma başarısız');
    }
  };

  const handleGenerateAll = async () => {
    try {
      const res = await api.post('/recurring-expenses/generate-all', {
        institution: institution._id,
        season: season._id,
      });
      setSuccess(res.data.message);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Toplu gider oluşturma başarısız');
    }
  };

  // === Delete Paid Expense ===
  const handleDeleteWithApproval = async () => {
    try {
      if (!deleteDialog.password) {
        setError('Lütfen admin şifrenizi giriniz');
        return;
      }

      await api.post(`/cash-registers/transactions/${deleteDialog.expense._id}/delete`, {
        password: deleteDialog.password,
        transactionType: 'Expense',
        userId: currentUser._id,
      });

      setError('');
      setSuccess('Gider başarıyla silindi');
      setDeleteDialog({ open: false, expense: null, password: '' });
      await loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi sırasında hata oluştu');
    }
  };

  // === Delete Pending Expense ===
  const handleDeletePendingExpense = async () => {
    try {
      await api.delete(`/expenses/${selectedExpense._id}`);
      setSuccess('Bekleyen gider silindi');
      setOpenDeleteExpense(false);
      setSelectedExpense(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme başarısız');
    }
  };

  // === Export ===
  const handleExportToExcel = async () => {
    try {
      await exportExpenses({
        institutionId: institution._id,
        seasonId: season._id,
      });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      setError('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  // === Helpers ===
  const getStatusColor = (status) => {
    switch (status) {
      case 'overdue': return 'error';
      case 'pending': return 'warning';
      case 'paid': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'overdue': return 'Gecikmiş';
      case 'pending': return 'Bekliyor';
      case 'paid': return 'Ödendi';
      default: return status;
    }
  };

  // Helper to get time period for expense
  const getExpenseTimePeriod = (expense) => {
    if (expense.status === 'overdue') return { label: 'Gecikmiş', color: 'error' };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(expense.dueDate);
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return { label: 'Bu Hafta', color: 'warning' };
    if (diffDays <= 15) return { label: 'Yaklaşan', color: 'info' };
    if (diffDays <= 30) return { label: 'Bu Ay', color: 'secondary' };
    if (diffDays <= 90) return { label: '3 Ay', color: 'primary' };
    if (diffDays <= 180) return { label: '6 Ay', color: 'default' };
    return { label: '6+ Ay', color: 'default' };
  };

  const filteredExpenses = expenses.filter((expense) =>
    filterCategory === 'all' ? true : expense.category === filterCategory
  );

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const allPendingList = [
    ...(pendingExpenses.overdue || []),
    ...(pendingExpenses.thisWeek || []),
    ...(pendingExpenses.upcoming || []),
    ...(pendingExpenses.nextMonth || []),
    ...(pendingExpenses.next3Months || []),
    ...(pendingExpenses.next6Months || []),
    ...(pendingExpenses.later || []),
  ];

  if (loading) {
    return <LoadingSpinner message="Giderler yükleniyor..." />;
  }

  if (!institution || !season) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum ve sezon seçin
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: { xs: 10, md: 2 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'}>Giderler</Typography>
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<FileDownload />} onClick={handleExportToExcel}>
              Excel
            </Button>
          </Box>
        )}
      </Box>

      {/* Alerts */}
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={4} sm={2}>
          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'error.light' }}>
            <Warning color="error" sx={{ fontSize: 20 }} />
            <Typography variant="h6" color="error.dark">{pendingExpenses.totals?.overdueCount || 0}</Typography>
            <Typography variant="caption" color="error.dark">Gecikmiş</Typography>
            <Typography variant="body2" fontWeight="bold" color="error.dark">
              {(pendingExpenses.totals?.overdueAmount || 0).toLocaleString('tr-TR')}₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2}>
          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'warning.light' }}>
            <Schedule color="warning" sx={{ fontSize: 20 }} />
            <Typography variant="h6" color="warning.dark">{pendingExpenses.totals?.thisWeekCount || 0}</Typography>
            <Typography variant="caption" color="warning.dark">Bu Hafta</Typography>
            <Typography variant="body2" fontWeight="bold" color="warning.dark">
              {(pendingExpenses.totals?.thisWeekAmount || 0).toLocaleString('tr-TR')}₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2}>
          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'info.light' }}>
            <CalendarMonth color="info" sx={{ fontSize: 20 }} />
            <Typography variant="h6" color="info.dark">{pendingExpenses.totals?.upcomingCount || 0}</Typography>
            <Typography variant="caption" color="info.dark">Yaklaşan (15 gün)</Typography>
            <Typography variant="body2" fontWeight="bold" color="info.dark">
              {(pendingExpenses.totals?.upcomingAmount || 0).toLocaleString('tr-TR')}₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2}>
          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.light' }}>
            <CalendarMonth sx={{ fontSize: 20, color: 'secondary.dark' }} />
            <Typography variant="h6" color="secondary.dark">{(pendingExpenses.totals?.nextMonthCount || 0) + (pendingExpenses.totals?.next3MonthsCount || 0)}</Typography>
            <Typography variant="caption" color="secondary.dark">3 Ay İçinde</Typography>
            <Typography variant="body2" fontWeight="bold" color="secondary.dark">
              {((pendingExpenses.totals?.nextMonthAmount || 0) + (pendingExpenses.totals?.next3MonthsAmount || 0)).toLocaleString('tr-TR')}₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2}>
          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.200' }}>
            <CalendarMonth sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="h6">{(pendingExpenses.totals?.next6MonthsCount || 0) + (pendingExpenses.totals?.laterCount || 0)}</Typography>
            <Typography variant="caption">6+ Ay</Typography>
            <Typography variant="body2" fontWeight="bold">
              {((pendingExpenses.totals?.next6MonthsAmount || 0) + (pendingExpenses.totals?.laterAmount || 0)).toLocaleString('tr-TR')}₺
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2}>
          <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
            <TrendingUp sx={{ fontSize: 20, color: 'primary.dark' }} />
            <Typography variant="h6" color="primary.dark">{pendingExpenses.totals?.totalCount || 0}</Typography>
            <Typography variant="caption" color="primary.dark">Toplam</Typography>
            <Typography variant="body2" fontWeight="bold" color="primary.dark">
              {(pendingExpenses.totals?.totalAmount || 0).toLocaleString('tr-TR')}₺
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Bekleyen (${allPendingList.length})`} icon={<Schedule />} iconPosition="start" />
          <Tab label="Gider Geçmişi" icon={<History />} iconPosition="start" />
          <Tab label="Düzenli Şablonlar" icon={<Repeat />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        /* Pending Expenses Tab */
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => {
              setFormData(prev => ({ ...prev, status: 'pending', showInCalendar: true }));
              handleOpenDialog();
            }}>
              Vadeli Gider Ekle
            </Button>
          </Box>

          {allPendingList.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Bekleyen gider yok
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {allPendingList.map((expense) => {
                const timePeriod = getExpenseTimePeriod(expense);
                return (
                  <Grid item xs={12} md={6} key={expense._id}>
                    <Card sx={{
                      borderLeft: 4,
                      borderColor: `${timePeriod.color}.main`
                    }}>
                      <CardContent sx={{ pb: '12px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {expense.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Vade: {new Date(expense.dueDate).toLocaleDateString('tr-TR')}
                              {expense.recurringExpense && (
                                <Chip label="Düzenli" size="small" sx={{ ml: 1 }} icon={<Repeat fontSize="small" />} />
                              )}
                            </Typography>
                          </Box>
                          <Chip
                            label={timePeriod.label}
                            color={timePeriod.color}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Chip label={expense.category} size="small" variant="outlined" sx={{ mr: 1 }} />
                            <Typography variant="h6" component="span" color="error.main">
                              {expense.amount?.toLocaleString('tr-TR')} TL
                            </Typography>
                          </Box>
                          <Box>
                            <Tooltip title="Öde">
                              <IconButton color="success" onClick={() => handleOpenPayDialog(expense)}>
                                <Payment />
                              </IconButton>
                            </Tooltip>
                            {!expense.isFromRecurring && (
                              <Tooltip title="Sil">
                                <IconButton color="error" onClick={() => { setSelectedExpense(expense); setOpenDeleteExpense(true); }}>
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        /* Expense History Tab */
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Kategori Filtrele</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="Kategori Filtrele"
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                  Yeni Gider
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" color="error.main" textAlign="right">
                  Toplam: {totalExpenses.toLocaleString('tr-TR')} TL
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {isMobile ? (
            <Grid container spacing={1.5}>
              {filteredExpenses.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">Henüz gider kaydı yok</Typography>
                  </Paper>
                </Grid>
              ) : (
                filteredExpenses.map((expense) => (
                  <Grid item xs={12} key={expense._id}>
                    <Card>
                      <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">{expense.description}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {new Date(expense.expenseDate).toLocaleDateString('tr-TR')}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleOpenDialog(expense)} color="primary">
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => setDeleteDialog({ open: true, expense, password: '' })} color="error">
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Chip label={expense.category} size="small" />
                          <Typography variant="body1" color="error.main" fontWeight="bold">
                            {expense.amount?.toLocaleString('tr-TR')} TL
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Açıklama</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell>Tutar</TableCell>
                    <TableCell>Kasa</TableCell>
                    <TableCell align="right">İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">Henüz gider kaydı yok</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell>{new Date(expense.expenseDate).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>
                          {expense.description}
                          {expense.isFromRecurring && <Chip label="Düzenli" size="small" sx={{ ml: 1 }} />}
                        </TableCell>
                        <TableCell><Chip label={expense.category} size="small" /></TableCell>
                        <TableCell>
                          <Typography color="error.main" fontWeight="bold">
                            {expense.amount?.toLocaleString('tr-TR')} TL
                          </Typography>
                        </TableCell>
                        <TableCell>{expense.cashRegister?.name || '-'}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleOpenDialog(expense)} color="primary">
                            <Edit />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteDialog({ open: true, expense, password: '' })} color="error">
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        /* Recurring Templates Tab */
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenRecurringDialog()}>
              Yeni Düzenli Gider
            </Button>
          </Box>

          {recurringExpenses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Repeat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Henüz düzenli gider tanımlanmamış
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {recurringExpenses.map((recurring) => (
                <Grid item xs={12} md={6} key={recurring._id}>
                  <Card sx={{ opacity: recurring.isActive ? 1 : 0.6 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="h6">{recurring.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {FREQUENCY_OPTIONS.find(f => f.value === recurring.frequency)?.label} •
                            Vade: {recurring.dueDayType === 'fixed' ? `${recurring.dueDay}. gün` : `${recurring.dueDayRangeStart}-${recurring.dueDayRangeEnd}. gün`}
                          </Typography>
                        </Box>
                        <Chip
                          label={recurring.isActive ? 'Aktif' : 'Pasif'}
                          color={recurring.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip label={recurring.category} size="small" variant="outlined" />
                        {recurring.instructor && (
                          <Chip
                            label={`${recurring.instructor.firstName} ${recurring.instructor.lastName}`}
                            size="small"
                            color="secondary"
                          />
                        )}
                        <Typography variant="h6" color="primary.main">
                          {recurring.estimatedAmount?.toLocaleString('tr-TR')} TL
                          {recurring.amountType === 'variable' && ' (tahmini)'}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(recurring.startDate).toLocaleDateString('tr-TR')} -
                        {recurring.endDate ? new Date(recurring.endDate).toLocaleDateString('tr-TR') : 'Süresiz'}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Tooltip title="Gider Oluştur">
                          <IconButton size="small" color="primary" onClick={() => handleOpenGenerateDialog(recurring)}>
                            <EventNote />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" color="info" onClick={() => handleOpenRecurringDialog(recurring)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" color="error" onClick={() => { setSelectedRecurring(recurring); setOpenConfirm(true); }}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* FAB for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 72, right: 16 }}
          onClick={() => activeTab === 2 ? handleOpenRecurringDialog() : handleOpenDialog()}
        >
          <Add />
        </Fab>
      )}

      {/* One-time Expense Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{selectedExpense ? 'Gider Düzenle' : 'Yeni Gider'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel>Gider Türü</FormLabel>
                  <RadioGroup
                    row
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <FormControlLabel value="paid" control={<Radio />} label="Hemen Öde" />
                    <FormControlLabel value="pending" control={<Radio />} label="Vadeli (Beklemede)" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tutar (TL)"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Kategori</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    label="Kategori"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {formData.category === 'Eğitmen Ödemesi' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Eğitmen</InputLabel>
                    <Select
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                      label="Eğitmen"
                    >
                      {instructors.map((inst) => (
                        <MenuItem key={inst._id} value={inst._id}>
                          {inst.firstName} {inst.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              {formData.status === 'paid' ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Ödeme Tarihi"
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Kasa</InputLabel>
                      <Select
                        value={formData.cashRegister}
                        onChange={(e) => setFormData({ ...formData, cashRegister: e.target.value })}
                        label="Kasa"
                      >
                        {cashRegisters.map((reg) => (
                          <MenuItem key={reg._id} value={reg._id}>{reg.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vade Tarihi"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.showInCalendar}
                          onChange={(e) => setFormData({ ...formData, showInCalendar: e.target.checked })}
                        />
                      }
                      label="Takvimde Göster"
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notlar"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained">Kaydet</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Recurring Expense Dialog */}
      <Dialog open={openRecurringDialog} onClose={handleCloseRecurringDialog} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>{selectedRecurring ? 'Düzenli Gider Düzenle' : 'Yeni Düzenli Gider'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Başlık"
                value={recurringFormData.title}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, title: e.target.value })}
                required
                placeholder="örn: Aylık Kira"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={recurringFormData.category}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, category: e.target.value })}
                  label="Kategori"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {recurringFormData.category === 'Eğitmen Ödemesi' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Eğitmen</InputLabel>
                  <Select
                    value={recurringFormData.instructor}
                    onChange={(e) => {
                      const selectedInstructor = instructors.find(i => i._id === e.target.value);
                      setRecurringFormData({
                        ...recurringFormData,
                        instructor: e.target.value,
                        // Auto-fill title and amount if not already set
                        title: recurringFormData.title || (selectedInstructor ? `${selectedInstructor.firstName} ${selectedInstructor.lastName} - Aylık Maaş` : ''),
                        estimatedAmount: recurringFormData.estimatedAmount || (selectedInstructor?.paymentAmount || ''),
                      });
                    }}
                    label="Eğitmen"
                  >
                    {instructors.filter(inst => inst.paymentType === 'monthly').map((inst) => (
                      <MenuItem key={inst._id} value={inst._id}>
                        {inst.firstName} {inst.lastName} - {inst.paymentAmount?.toLocaleString('tr-TR')} TL/ay
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <FormControl component="fieldset">
                <FormLabel>Tutar Türü</FormLabel>
                <RadioGroup
                  row
                  value={recurringFormData.amountType}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, amountType: e.target.value })}
                >
                  <FormControlLabel value="fixed" control={<Radio />} label="Sabit" />
                  <FormControlLabel value="variable" control={<Radio />} label="Değişken" />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={recurringFormData.amountType === 'fixed' ? 'Tutar (TL)' : 'Tahmini Tutar (TL)'}
                type="number"
                value={recurringFormData.estimatedAmount}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, estimatedAmount: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tekrar Sıklığı</InputLabel>
                <Select
                  value={recurringFormData.frequency}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, frequency: e.target.value })}
                  label="Tekrar Sıklığı"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl component="fieldset">
                <FormLabel>Vade Günü</FormLabel>
                <RadioGroup
                  row
                  value={recurringFormData.dueDayType}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, dueDayType: e.target.value })}
                >
                  <FormControlLabel value="fixed" control={<Radio />} label="Sabit Gün" />
                  <FormControlLabel value="range" control={<Radio />} label="Aralık" />
                </RadioGroup>
              </FormControl>
            </Grid>
            {recurringFormData.dueDayType === 'fixed' ? (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Vade Günü (1-31)"
                  type="number"
                  value={recurringFormData.dueDay}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, dueDay: e.target.value })}
                  inputProps={{ min: 1, max: 31 }}
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Başlangıç Günü"
                    type="number"
                    value={recurringFormData.dueDayRangeStart}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, dueDayRangeStart: e.target.value })}
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Bitiş Günü"
                    type="number"
                    value={recurringFormData.dueDayRangeEnd}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, dueDayRangeEnd: e.target.value })}
                    inputProps={{ min: 1, max: 31 }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Başlangıç Tarihi"
                type="date"
                value={recurringFormData.startDate}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bitiş Tarihi (Opsiyonel)"
                type="date"
                value={recurringFormData.endDate}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Boş bırakılırsa süresiz devam eder"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Varsayılan Kasa</InputLabel>
                <Select
                  value={recurringFormData.defaultCashRegister}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, defaultCashRegister: e.target.value })}
                  label="Varsayılan Kasa"
                >
                  <MenuItem value="">Seçilmedi</MenuItem>
                  {cashRegisters.map((reg) => (
                    <MenuItem key={reg._id} value={reg._id}>{reg.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={recurringFormData.isActive}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, isActive: e.target.checked })}
                  />
                }
                label="Aktif"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notlar"
                multiline
                rows={2}
                value={recurringFormData.notes}
                onChange={(e) => setRecurringFormData({ ...recurringFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecurringDialog}>İptal</Button>
          <Button variant="contained" onClick={handleSubmitRecurring}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gider Öde</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ mb: 2, mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">{selectedExpense.description}</Typography>
              <Typography variant="body2" color="text.secondary">
                Vade: {new Date(selectedExpense.dueDate).toLocaleDateString('tr-TR')}
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar (TL)"
                type="number"
                value={payFormData.amount}
                onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Kasa</InputLabel>
                <Select
                  value={payFormData.cashRegisterId}
                  onChange={(e) => setPayFormData({ ...payFormData, cashRegisterId: e.target.value })}
                  label="Kasa"
                >
                  {cashRegisters.map((reg) => (
                    <MenuItem key={reg._id} value={reg._id}>{reg.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ödeme Tarihi"
                type="date"
                value={payFormData.expenseDate}
                onChange={(e) => setPayFormData({ ...payFormData, expenseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notlar"
                multiline
                rows={2}
                value={payFormData.notes}
                onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayDialog(false)}>İptal</Button>
          <Button variant="contained" color="success" onClick={handlePay}>Öde</Button>
        </DialogActions>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={openGenerateDialog} onClose={() => setOpenGenerateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gider Oluştur</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            {selectedRecurring?.title} için belirtilen tarih aralığındaki giderleri oluşturur.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Başlangıç Tarihi"
                type="date"
                value={generateFormData.startDate}
                onChange={(e) => setGenerateFormData({ ...generateFormData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bitiş Tarihi"
                type="date"
                value={generateFormData.endDate}
                onChange={(e) => setGenerateFormData({ ...generateFormData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerateDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleGenerate}>Oluştur</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Recurring Expense Confirm */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Düzenli Gideri Sil</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Bu düzenli gider ve bağlı bekleyen giderler silinecek. Ödenmiş giderler korunacak.
          </Alert>
          {selectedRecurring && (
            <Typography sx={{ mt: 2 }}><strong>{selectedRecurring.title}</strong></Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDeleteRecurring}>Sil</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Pending Expense Confirm */}
      <Dialog open={openDeleteExpense} onClose={() => setOpenDeleteExpense(false)}>
        <DialogTitle>Bekleyen Gideri Sil</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Bu gider silinecek. Bu işlem geri alınamaz.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteExpense(false)}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDeletePendingExpense}>Sil</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Paid Expense with Admin Approval */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, expense: null, password: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Gideri Sil - Admin Onayı</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
            Bu gideri silmek kasa bakiyesini etkileyecektir. İşlem geri alınamaz!
          </Alert>
          {deleteDialog.expense && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2"><strong>Kategori:</strong> {deleteDialog.expense.category}</Typography>
              <Typography variant="body2"><strong>Açıklama:</strong> {deleteDialog.expense.description}</Typography>
              <Typography variant="body2"><strong>Tutar:</strong> {deleteDialog.expense.amount?.toLocaleString('tr-TR')} TL</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            type="password"
            label="Admin Şifresi"
            value={deleteDialog.password}
            onChange={(e) => setDeleteDialog({ ...deleteDialog, password: e.target.value })}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, expense: null, password: '' })}>İptal</Button>
          <Button onClick={handleDeleteWithApproval} color="error" variant="contained">Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
