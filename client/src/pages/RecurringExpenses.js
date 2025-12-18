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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControlLabel,
  Switch,
  RadioGroup,
  Radio,
  FormLabel,
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
  Refresh,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';

const EXPENSE_CATEGORIES = [
  'Kira',
  'Elektrik',
  'Su',
  'Doğalgaz',
  'İnternet',
  'Telefon',
  'Muhasebe',
  'Hukuk',
  'Danışmanlık',
  'Sigorta',
  'Vergi',
  'Web Hosting/Domain',
  'Yazılım Lisansı',
  'Temizlik Malzemeleri',
  'Bakım Onarım',
  'Diğer',
];

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Aylık' },
  { value: 'quarterly', label: '3 Aylık' },
  { value: 'yearly', label: 'Yıllık' },
];

const RecurringExpenses = () => {
  const { institution, season } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState({ overdue: [], thisWeek: [], upcoming: [], totals: {} });
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Form data for recurring expense
  const [formData, setFormData] = useState({
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
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (institution && season) {
      loadData();
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recurringRes, pendingRes, cashRes] = await Promise.all([
        api.get('/recurring-expenses', {
          params: { institution: institution._id, season: season._id },
        }),
        api.get('/recurring-expenses/pending/list', {
          params: { institution: institution._id, season: season._id, days: 60 },
        }),
        api.get('/cash-registers', {
          params: { institution: institution._id, isActive: true },
        }),
      ]);

      setRecurringExpenses(recurringRes.data);
      setPendingExpenses(pendingRes.data);
      setCashRegisters(cashRes.data);
    } catch (err) {
      setError('Veriler yüklenirken hata oluştu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (recurring = null) => {
    if (recurring) {
      setSelectedRecurring(recurring);
      setFormData({
        title: recurring.title,
        category: recurring.category,
        description: recurring.description || '',
        amountType: recurring.amountType,
        estimatedAmount: recurring.estimatedAmount,
        frequency: recurring.frequency,
        dueDayType: recurring.dueDayType,
        dueDay: recurring.dueDay || 1,
        dueDayRangeStart: recurring.dueDayRangeStart || 1,
        dueDayRangeEnd: recurring.dueDayRangeEnd || 5,
        startDate: recurring.startDate ? recurring.startDate.split('T')[0] : '',
        endDate: recurring.endDate ? recurring.endDate.split('T')[0] : '',
        defaultCashRegister: recurring.defaultCashRegister?._id || '',
        isActive: recurring.isActive,
        notes: recurring.notes || '',
      });
    } else {
      setSelectedRecurring(null);
      setFormData({
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
        isActive: true,
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRecurring(null);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        institution: institution._id,
        season: season._id,
        estimatedAmount: parseFloat(formData.estimatedAmount),
        dueDay: parseInt(formData.dueDay),
        dueDayRangeStart: parseInt(formData.dueDayRangeStart),
        dueDayRangeEnd: parseInt(formData.dueDayRangeEnd),
      };

      if (!data.endDate) delete data.endDate;
      if (!data.defaultCashRegister) delete data.defaultCashRegister;

      if (selectedRecurring) {
        await api.put(`/recurring-expenses/${selectedRecurring._id}`, data);
        setSuccess('Düzenli gider güncellendi');
      } else {
        const response = await api.post('/recurring-expenses', data);
        const generatedCount = response.data.generatedCount || 0;
        setSuccess(`Düzenli gider oluşturuldu ve ${generatedCount} gider kaydı oluşturuldu`);
      }

      handleCloseDialog();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/recurring-expenses/${selectedRecurring._id}`);
      setSuccess('Düzenli gider silindi');
      setOpenConfirm(false);
      setSelectedRecurring(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme başarısız');
    }
  };

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

  const handleOpenGenerateDialog = (recurring) => {
    setSelectedRecurring(recurring);
    // Default endDate to recurring expense's endDate, or 1 year from start if no endDate
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

  const handleDeletePendingExpense = async (expenseId) => {
    try {
      await api.delete(`/recurring-expenses/expense/${expenseId}`);
      setSuccess('Bekleyen gider silindi');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Silme başarısız');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'overdue':
        return <Chip label="Gecikmiş" color="error" size="small" icon={<Warning />} />;
      case 'pending':
        return <Chip label="Bekliyor" color="warning" size="small" icon={<Schedule />} />;
      case 'paid':
        return <Chip label="Ödendi" color="success" size="small" icon={<CheckCircle />} />;
      default:
        return null;
    }
  };

  const getFrequencyLabel = (freq) => {
    return FREQUENCY_OPTIONS.find((f) => f.value === freq)?.label || freq;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Düzenli Giderler
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleGenerateAll}
            size={isMobile ? 'small' : 'medium'}
          >
            Giderleri Oluştur
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            size={isMobile ? 'small' : 'medium'}
          >
            Yeni Düzenli Gider
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption">Gecikmiş</Typography>
              <Typography variant="h6">{formatCurrency(pendingExpenses.totals.overdueAmount)}</Typography>
              <Typography variant="caption">{pendingExpenses.totals.overdueCount || 0} gider</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption">Bu Hafta</Typography>
              <Typography variant="h6">{formatCurrency(pendingExpenses.totals.thisWeekAmount)}</Typography>
              <Typography variant="caption">{pendingExpenses.totals.thisWeekCount || 0} gider</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption">Yaklaşan</Typography>
              <Typography variant="h6">{formatCurrency(pendingExpenses.totals.upcomingAmount)}</Typography>
              <Typography variant="caption">{pendingExpenses.totals.upcomingCount || 0} gider</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'grey.200' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption">Aylık Toplam</Typography>
              <Typography variant="h6">
                {formatCurrency(recurringExpenses.filter((r) => r.isActive).reduce((sum, r) => sum + r.estimatedAmount, 0))}
              </Typography>
              <Typography variant="caption">{recurringExpenses.filter((r) => r.isActive).length} aktif gider</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab label="Bekleyen Ödemeler" icon={<Schedule />} iconPosition="start" />
          <Tab label="Düzenli Gider Şablonları" icon={<Repeat />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Pending Expenses */}
      {activeTab === 0 && (
        <Box>
          {/* Overdue */}
          {pendingExpenses.overdue.length > 0 && (
            <Paper sx={{ mb: 2, border: '2px solid', borderColor: 'error.main' }}>
              <Box sx={{ bgcolor: 'error.main', color: 'white', px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Gecikmiş Ödemeler ({pendingExpenses.overdue.length})
                </Typography>
              </Box>
              <List dense>
                {pendingExpenses.overdue.map((expense) => (
                  <ListItem key={expense._id} divider>
                    <ListItemText
                      primary={expense.description}
                      secondary={`Vade: ${formatDate(expense.dueDate)} | Tutar: ${formatCurrency(expense.amount)}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<Payment />}
                        onClick={() => handleOpenPayDialog(expense)}
                      >
                        Öde
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* This Week */}
          {pendingExpenses.thisWeek.length > 0 && (
            <Paper sx={{ mb: 2, border: '2px solid', borderColor: 'warning.main' }}>
              <Box sx={{ bgcolor: 'warning.main', color: 'white', px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Bu Hafta ({pendingExpenses.thisWeek.length})
                </Typography>
              </Box>
              <List dense>
                {pendingExpenses.thisWeek.map((expense) => (
                  <ListItem key={expense._id} divider>
                    <ListItemText
                      primary={expense.description}
                      secondary={`Vade: ${formatDate(expense.dueDate)} | Tutar: ${formatCurrency(expense.amount)}`}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        startIcon={<Payment />}
                        onClick={() => handleOpenPayDialog(expense)}
                      >
                        Öde
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Upcoming */}
          {pendingExpenses.upcoming.length > 0 && (
            <Paper sx={{ mb: 2 }}>
              <Box sx={{ bgcolor: 'info.main', color: 'white', px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Yaklaşan ({pendingExpenses.upcoming.length})
                </Typography>
              </Box>
              <List dense>
                {pendingExpenses.upcoming.map((expense) => (
                  <ListItem key={expense._id} divider>
                    <ListItemText
                      primary={expense.description}
                      secondary={`Vade: ${formatDate(expense.dueDate)} | Tutar: ${formatCurrency(expense.amount)}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePendingExpense(expense._id)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {pendingExpenses.overdue.length === 0 &&
            pendingExpenses.thisWeek.length === 0 &&
            pendingExpenses.upcoming.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Bekleyen ödeme yok
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tüm düzenli giderler ödendi veya henüz gider oluşturulmadı.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleGenerateAll}
                  sx={{ mt: 2 }}
                >
                  Giderleri Oluştur
                </Button>
              </Paper>
            )}
        </Box>
      )}

      {/* Tab 1: Recurring Expense Templates */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table size={isMobile ? 'small' : 'medium'}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell>Başlık</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell align="right">Tutar</TableCell>
                <TableCell>Sıklık</TableCell>
                <TableCell>Vade Günü</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="center">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recurringExpenses.map((recurring) => (
                <TableRow key={recurring._id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{recurring.title}</Typography>
                    {recurring.description && (
                      <Typography variant="caption" color="text.secondary">
                        {recurring.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{recurring.category}</TableCell>
                  <TableCell align="right">
                    {recurring.amountType === 'variable' && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        ~
                      </Typography>
                    )}
                    {formatCurrency(recurring.estimatedAmount)}
                  </TableCell>
                  <TableCell>{getFrequencyLabel(recurring.frequency)}</TableCell>
                  <TableCell>
                    {recurring.dueDayType === 'fixed'
                      ? `Ayın ${recurring.dueDay}.`
                      : `Ayın ${recurring.dueDayRangeStart}-${recurring.dueDayRangeEnd}.`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={recurring.isActive ? 'Aktif' : 'Pasif'}
                      color={recurring.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Gider Oluştur">
                      <IconButton size="small" onClick={() => handleOpenGenerateDialog(recurring)}>
                        <CalendarMonth />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => handleOpenDialog(recurring)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedRecurring(recurring);
                          setOpenConfirm(true);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {recurringExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Henüz düzenli gider tanımlanmamış
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Recurring Expense Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedRecurring ? 'Düzenli Gider Düzenle' : 'Yeni Düzenli Gider'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Başlık"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ör: Kira, Muhasebe, İnternet"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Kategori"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Sıklık</InputLabel>
                <Select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  label="Sıklık"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel>Tutar Tipi</FormLabel>
                <RadioGroup
                  row
                  value={formData.amountType}
                  onChange={(e) => setFormData({ ...formData, amountType: e.target.value })}
                >
                  <FormControlLabel value="fixed" control={<Radio />} label="Sabit" />
                  <FormControlLabel value="variable" control={<Radio />} label="Değişken (Tahmini)" />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={formData.amountType === 'fixed' ? 'Tutar (TL)' : 'Tahmini Tutar (TL)'}
                type="number"
                value={formData.estimatedAmount}
                onChange={(e) => setFormData({ ...formData, estimatedAmount: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Varsayılan Kasa</InputLabel>
                <Select
                  value={formData.defaultCashRegister}
                  onChange={(e) => setFormData({ ...formData, defaultCashRegister: e.target.value })}
                  label="Varsayılan Kasa"
                >
                  <MenuItem value="">Seçilmedi</MenuItem>
                  {cashRegisters.map((cash) => (
                    <MenuItem key={cash._id} value={cash._id}>
                      {cash.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Vade Günü
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={formData.dueDayType}
                  onChange={(e) => setFormData({ ...formData, dueDayType: e.target.value })}
                >
                  <FormControlLabel value="fixed" control={<Radio />} label="Sabit Gün" />
                  <FormControlLabel value="range" control={<Radio />} label="Tarih Aralığı" />
                </RadioGroup>
              </FormControl>
            </Grid>

            {formData.dueDayType === 'fixed' ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ayın Kaçı"
                  type="number"
                  inputProps={{ min: 1, max: 31 }}
                  value={formData.dueDay}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                />
              </Grid>
            ) : (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Başlangıç Günü"
                    type="number"
                    inputProps={{ min: 1, max: 31 }}
                    value={formData.dueDayRangeStart}
                    onChange={(e) => setFormData({ ...formData, dueDayRangeStart: e.target.value })}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Bitiş Günü"
                    type="number"
                    inputProps={{ min: 1, max: 31 }}
                    value={formData.dueDayRangeEnd}
                    onChange={(e) => setFormData({ ...formData, dueDayRangeEnd: e.target.value })}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Geçerlilik Dönemi
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Başlangıç Tarihi"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Geriye dönük giderler için geçmiş tarih seçebilirsiniz"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bitiş Tarihi (Opsiyonel)"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                helperText="Boş bırakırsanız süresiz devam eder"
              />
            </Grid>

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

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Aktif"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.title || !formData.category || !formData.estimatedAmount}
          >
            {selectedRecurring ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Gider Öde</DialogTitle>
        <DialogContent dividers>
          {selectedExpense && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {selectedExpense.description}
              </Typography>
              <Typography variant="body2">
                Vade: {formatDate(selectedExpense.dueDate)}
              </Typography>
              {selectedExpense.estimatedAmount && (
                <Typography variant="body2" color="text.secondary">
                  Tahmini: {formatCurrency(selectedExpense.estimatedAmount)}
                </Typography>
              )}
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ödenen Tutar (TL)"
                type="number"
                value={payFormData.amount}
                onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Kasa</InputLabel>
                <Select
                  value={payFormData.cashRegisterId}
                  onChange={(e) => setPayFormData({ ...payFormData, cashRegisterId: e.target.value })}
                  label="Kasa"
                >
                  {cashRegisters.map((cash) => (
                    <MenuItem key={cash._id} value={cash._id}>
                      {cash.name} ({formatCurrency(cash.balance)})
                    </MenuItem>
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
                label="Not"
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
          <Button
            variant="contained"
            color="success"
            onClick={handlePay}
            disabled={!payFormData.amount || !payFormData.cashRegisterId}
            startIcon={<Payment />}
          >
            Öde
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={openGenerateDialog} onClose={() => setOpenGenerateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Gider Oluştur</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedRecurring?.title} için belirtilen tarih aralığındaki giderleri oluşturur.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Başlangıç Tarihi"
                type="date"
                value={generateFormData.startDate}
                onChange={(e) => setGenerateFormData({ ...generateFormData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
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
          <Button variant="contained" onClick={handleGenerate} startIcon={<CalendarMonth />}>
            Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleDelete}
        title="Düzenli Gideri Sil"
        message={`"${selectedRecurring?.title}" düzenli giderini silmek istediğinize emin misiniz?`}
      />

      {/* FAB for mobile */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog()}
        >
          <Add />
        </Fab>
      )}
    </Box>
  );
};

export default RecurringExpenses;
