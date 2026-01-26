import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  LinearProgress,
} from '@mui/material';
import { Add, Edit, AccountBalance, AddCircle, RemoveCircle, SwapHoriz, Receipt, Delete, Download, ExpandMore, TrendingUp, TrendingDown, Wallet, AttachMoney } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const CashRegisters = () => {
  const { institution, season, currentUser } = useApp();
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initialBalance: 0,
  });

  // Adjust balance dialog state
  const [adjustDialog, setAdjustDialog] = useState({
    open: false,
    cashRegister: null,
    type: 'add',
    amount: '',
    description: ''
  });

  // Transfer dialog state
  const [transferDialog, setTransferDialog] = useState({
    open: false,
    fromCashRegisterId: '',
    toCashRegisterId: '',
    amount: '',
    description: ''
  });

  // Transactions dialog state
  const [transactionsDialog, setTransactionsDialog] = useState({
    open: false,
    cashRegister: null,
    transactions: [],
    loading: false
  });

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    transaction: null,
    password: ''
  });

  // Expanded cash register for accordion
  const [expandedCashRegister, setExpandedCashRegister] = useState(null);

  // Summary data
  const [summaryData, setSummaryData] = useState({
    totalIncome: 0,
    totalExpense: 0, // Sadece ödenmiş (gerçekleşen) giderler
    totalExpectedExpense: 0, // Beklenen (planlanmış ama ödenmemiş) giderler
    expectedExpenseEndDate: null, // Beklenen giderlerin son tarihi
    incomeByCategory: [],
    expenseByCategory: [], // Ödenmiş giderler
    expectedExpenseByCategory: [] // Beklenen giderler
  });

  // Summary dialog
  const [summaryDialog, setSummaryDialog] = useState({
    open: false,
    type: null, // 'income' or 'expense'
    data: []
  });

  useEffect(() => {
    if (institution) {
      loadCashRegisters();
      loadSummaryData();
    }
  }, [institution, season]);

  const loadCashRegisters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cash-registers', {
        params: { institution: institution._id },
      });
      setCashRegisters(response.data);
    } catch (error) {
      console.error('Error loading cash registers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaryData = async () => {
    try {
      // Load payments (income) - only completed payments
      const paymentsRes = await api.get('/payments', {
        params: { institutionId: institution._id, seasonId: season?._id }
      });
      const payments = (paymentsRes.data || []).filter(p => p.status === 'completed');
      const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Group income by payment type
      const incomeByCategory = {};
      payments.forEach(p => {
        const cat = p.paymentType === 'creditCard' ? 'Kredi Kartı' : 'Nakit';
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (p.amount || 0);
      });

      // Load expenses
      const expensesRes = await api.get('/expenses', {
        params: { institutionId: institution._id, seasonId: season?._id }
      });
      const allExpenses = expensesRes.data || [];

      // Filter out internal accounting entries (transfers, manual adjustments)
      const realExpenses = allExpenses.filter(e =>
        !e.isManualIncome &&
        !e.isTransfer &&
        e.category !== 'Kasa Giriş (Manuel)' &&
        e.category !== 'Kasa Çıkış (Manuel)' &&
        e.category !== 'Virman (Giriş)' &&
        e.category !== 'Virman (Çıkış)'
      );

      // PAID expenses - only expenses that are actually paid (kasadan çıkmış)
      const paidExpenses = realExpenses.filter(e => e.status === 'paid');
      const totalExpense = paidExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Group paid expenses by category
      const expenseByCategory = {};
      paidExpenses.forEach(e => {
        const cat = e.category || 'Diğer';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
      });

      // PENDING/EXPECTED expenses - not yet paid
      const pendingExpenses = realExpenses.filter(e => e.status === 'pending' || e.status === 'overdue');
      const totalExpectedExpense = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Find the latest due date for expected expenses
      let expectedExpenseEndDate = null;
      if (pendingExpenses.length > 0) {
        const latestDate = pendingExpenses.reduce((latest, e) => {
          const dueDate = new Date(e.dueDate);
          return dueDate > latest ? dueDate : latest;
        }, new Date(0));
        expectedExpenseEndDate = latestDate;
      }

      // Group pending expenses by category
      const expectedExpenseByCategory = {};
      pendingExpenses.forEach(e => {
        const cat = e.category || 'Diğer';
        expectedExpenseByCategory[cat] = (expectedExpenseByCategory[cat] || 0) + (e.amount || 0);
      });

      setSummaryData({
        totalIncome,
        totalExpense,
        totalExpectedExpense,
        expectedExpenseEndDate,
        incomeByCategory: Object.entries(incomeByCategory)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        expenseByCategory: Object.entries(expenseByCategory)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount),
        expectedExpenseByCategory: Object.entries(expectedExpenseByCategory)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
      });
    } catch (error) {
      console.error('Error loading summary data:', error);
    }
  };

  // Handle accordion expansion
  const handleAccordionChange = (registerId) => (event, isExpanded) => {
    setExpandedCashRegister(isExpanded ? registerId : null);
  };

  // Show summary details
  const handleShowSummaryDetails = (type) => {
    setSummaryDialog({
      open: true,
      type,
      data: type === 'income' ? summaryData.incomeByCategory : summaryData.expenseByCategory
    });
  };

  const handleOpenDialog = (register = null) => {
    if (register) {
      setSelectedRegister(register);
      setFormData({
        name: register.name || '',
        description: register.description || '',
        initialBalance: register.initialBalance || 0,
      });
    } else {
      setSelectedRegister(null);
      setFormData({
        name: '',
        description: '',
        initialBalance: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRegister(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const registerData = {
        ...formData,
        institution: institution._id,
        season: season._id,
        initialBalance: parseFloat(formData.initialBalance),
        createdBy: currentUser?.username,
        updatedBy: currentUser?.username,
      };

      if (selectedRegister) {
        await api.put(`/cash-registers/${selectedRegister._id}`, registerData);
      } else {
        await api.post('/cash-registers', registerData);
      }

      await loadCashRegisters();
      handleCloseDialog();
      setSuccess('Kasa başarıyla kaydedildi');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Handle adjust balance
  const handleAdjustBalance = (cashRegister, type) => {
    setAdjustDialog({
      open: true,
      cashRegister,
      type,
      amount: '',
      description: ''
    });
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustDialog.amount || parseFloat(adjustDialog.amount) <= 0) {
      setError('Lütfen geçerli bir tutar giriniz');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.post(`/cash-registers/${adjustDialog.cashRegister._id}/adjust-balance`, {
        amount: parseFloat(adjustDialog.amount),
        description: adjustDialog.description,
        type: adjustDialog.type,
        createdBy: currentUser?.username
      });

      await loadCashRegisters();
      setAdjustDialog({ open: false, cashRegister: null, type: 'add', amount: '', description: '' });
      setSuccess(`Bakiye başarıyla ${adjustDialog.type === 'add' ? 'artırıldı' : 'azaltıldı'}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Handle transfer
  const handleOpenTransfer = () => {
    setTransferDialog({
      open: true,
      fromCashRegisterId: '',
      toCashRegisterId: '',
      amount: '',
      description: ''
    });
  };

  const handleSubmitTransfer = async () => {
    if (!transferDialog.fromCashRegisterId || !transferDialog.toCashRegisterId) {
      setError('Lütfen kaynak ve hedef kasa seçiniz');
      return;
    }

    if (!transferDialog.amount || parseFloat(transferDialog.amount) <= 0) {
      setError('Lütfen geçerli bir tutar giriniz');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await api.post('/cash-registers/transfer', {
        fromCashRegisterId: transferDialog.fromCashRegisterId,
        toCashRegisterId: transferDialog.toCashRegisterId,
        amount: parseFloat(transferDialog.amount),
        description: transferDialog.description,
        createdBy: currentUser?.username
      });

      await loadCashRegisters();
      setTransferDialog({ open: false, fromCashRegisterId: '', toCashRegisterId: '', amount: '', description: '' });
      setSuccess('Virman başarıyla gerçekleştirildi');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Load transactions for a cash register
  const loadTransactions = async (cashRegister) => {
    try {
      setTransactionsDialog(prev => ({ ...prev, loading: true, open: true, cashRegister }));
      const response = await api.get(`/cash-registers/${cashRegister._id}/transactions`);
      setTransactionsDialog(prev => ({
        ...prev,
        transactions: response.data,
        loading: false
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Hareketler yüklenirken bir hata oluştu');
      setTransactionsDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteTransaction = async () => {
    try {
      if (!deleteDialog.password) {
        setError('Lütfen admin şifrenizi giriniz');
        return;
      }

      await api.post(`/cash-registers/transactions/${deleteDialog.transaction.relatedId}/delete`, {
        password: deleteDialog.password,
        transactionType: deleteDialog.transaction.relatedTo,
        userId: currentUser?._id
      });

      setSuccess('Hareket başarıyla silindi');
      setDeleteDialog({ open: false, transaction: null, password: '' });

      // Reload transactions
      if (transactionsDialog.cashRegister) {
        await loadTransactions(transactionsDialog.cashRegister);
        await loadCashRegisters();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi sırasında hata oluştu');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Kasalar yükleniyor..." />;
  }

  if (!institution) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum seçin
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Kasa Yönetimi</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={handleOpenTransfer}
            disabled={cashRegisters.length < 2}
          >
            Virman Yap
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Yeni Kasa
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Financial Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Balance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: 'white',
              borderRadius: 2,
              cursor: 'default'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Wallet />
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Toplam Bakiye</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              ₺{cashRegisters.reduce((sum, r) => sum + (r.balance || 0), 0).toLocaleString('tr-TR')}
            </Typography>
          </Paper>
        </Grid>

        {/* Total Income Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: 'success.50',
              borderLeft: 4,
              borderColor: 'success.main',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'success.100' }
            }}
            onClick={() => handleShowSummaryDetails('income')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp color="success" />
              <Typography variant="subtitle2" color="text.secondary">Toplam Gelir</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
              ₺{summaryData.totalIncome.toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="caption" color="text.secondary">Detaylar için tıklayın</Typography>
          </Paper>
        </Grid>

        {/* Total Expense Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: 'error.50',
              borderLeft: 4,
              borderColor: 'error.main',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'error.100' }
            }}
            onClick={() => handleShowSummaryDetails('expense')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingDown color="error" />
              <Typography variant="subtitle2" color="text.secondary">Gerçekleşen Gider</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              ₺{summaryData.totalExpense.toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {summaryData.totalExpectedExpense > 0 && `+₺${summaryData.totalExpectedExpense.toLocaleString('tr-TR')} beklenen | `}
              Detaylar için tıklayın
            </Typography>
          </Paper>
        </Grid>

        {/* Net Balance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              bgcolor: (summaryData.totalIncome - summaryData.totalExpense) >= 0 ? 'info.50' : 'warning.50',
              borderLeft: 4,
              borderColor: (summaryData.totalIncome - summaryData.totalExpense) >= 0 ? 'info.main' : 'warning.main',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AttachMoney color={(summaryData.totalIncome - summaryData.totalExpense) >= 0 ? 'info' : 'warning'} />
              <Typography variant="subtitle2" color="text.secondary">Net Kar/Zarar (Gerçekleşen)</Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                color: (summaryData.totalIncome - summaryData.totalExpense) >= 0 ? 'info.main' : 'warning.main'
              }}
            >
              {(summaryData.totalIncome - summaryData.totalExpense) >= 0 ? '+' : ''}
              ₺{(summaryData.totalIncome - summaryData.totalExpense).toLocaleString('tr-TR')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Cash Registers Section */}
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
            Kasalar ({cashRegisters.length})
          </Typography>
        </Box>

        {cashRegisters.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <AccountBalance sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Henüz kasa eklenmedi
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
              Yeni Kasa Ekle
            </Button>
          </Box>
        ) : (
          cashRegisters
            .sort((a, b) => (b.balance || 0) - (a.balance || 0))
            .map((register, index) => (
              <Accordion
                key={register._id}
                expanded={expandedCashRegister === register._id}
                onChange={handleAccordionChange(register._id)}
                disableGutters
                sx={{
                  '&:before': { display: 'none' },
                  borderBottom: 1,
                  borderColor: 'divider'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    px: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                    borderLeft: 4,
                    borderColor: register.balance >= 0 ? 'success.main' : 'error.main'
                  }}
                >
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalance color={register.balance >= 0 ? 'success' : 'error'} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {register.name}
                          </Typography>
                          {register.description && (
                            <Typography variant="caption" color="text.secondary">
                              {register.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Mevcut Bakiye
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 'bold',
                          color: register.balance >= 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        ₺{(register.balance || 0).toLocaleString('tr-TR')}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Başlangıç
                      </Typography>
                      <Typography variant="body2">
                        ₺{(register.initialBalance || 0).toLocaleString('tr-TR')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Değişim
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: (register.balance || 0) - (register.initialBalance || 0) >= 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        {(register.balance || 0) - (register.initialBalance || 0) >= 0 ? '+' : ''}
                        ₺{((register.balance || 0) - (register.initialBalance || 0)).toLocaleString('tr-TR')}
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'grey.50', p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Receipt />}
                      onClick={() => loadTransactions(register)}
                    >
                      Hareketler
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      startIcon={<AddCircle />}
                      onClick={() => handleAdjustBalance(register, 'add')}
                    >
                      Bakiye Ekle
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<RemoveCircle />}
                      onClick={() => handleAdjustBalance(register, 'subtract')}
                    >
                      Bakiye Çıkar
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => handleOpenDialog(register)}
                    >
                      Düzenle
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))
        )}
      </Paper>

      {/* Add/Edit Cash Register Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{selectedRegister ? 'Kasa Düzenle' : 'Yeni Kasa'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kasa Adı"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Başlangıç Bakiyesi (₺)"
                  name="initialBalance"
                  type="number"
                  value={formData.initialBalance}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Adjust Balance Dialog */}
      <Dialog
        open={adjustDialog.open}
        onClose={() => setAdjustDialog({ ...adjustDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {adjustDialog.type === 'add' ? 'Bakiye Artır' : 'Bakiye Azalt'} - {adjustDialog.cashRegister?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar (₺)"
                type="number"
                value={adjustDialog.amount}
                onChange={(e) => setAdjustDialog({ ...adjustDialog, amount: e.target.value })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                value={adjustDialog.description}
                onChange={(e) => setAdjustDialog({ ...adjustDialog, description: e.target.value })}
                multiline
                rows={2}
                placeholder="Bakiye değişikliğinin sebebi"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog({ ...adjustDialog, open: false })}>
            İptal
          </Button>
          <Button
            onClick={handleSubmitAdjustment}
            variant="contained"
            color={adjustDialog.type === 'add' ? 'success' : 'error'}
            disabled={loading}
          >
            {loading ? 'Kaydediliyor...' : adjustDialog.type === 'add' ? 'Artır' : 'Azalt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog
        open={transferDialog.open}
        onClose={() => setTransferDialog({ ...transferDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Kasalar Arası Virman</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Kaynak Kasa</InputLabel>
                <Select
                  value={transferDialog.fromCashRegisterId}
                  onChange={(e) => setTransferDialog({ ...transferDialog, fromCashRegisterId: e.target.value })}
                  label="Kaynak Kasa"
                >
                  {cashRegisters.map((register) => (
                    <MenuItem key={register._id} value={register._id}>
                      {register.name} - Bakiye: ₺{(register.balance || 0).toLocaleString('tr-TR')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Hedef Kasa</InputLabel>
                <Select
                  value={transferDialog.toCashRegisterId}
                  onChange={(e) => setTransferDialog({ ...transferDialog, toCashRegisterId: e.target.value })}
                  label="Hedef Kasa"
                >
                  {cashRegisters
                    .filter((r) => r._id !== transferDialog.fromCashRegisterId)
                    .map((register) => (
                      <MenuItem key={register._id} value={register._id}>
                        {register.name} - Bakiye: ₺{(register.balance || 0).toLocaleString('tr-TR')}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar (₺)"
                type="number"
                value={transferDialog.amount}
                onChange={(e) => setTransferDialog({ ...transferDialog, amount: e.target.value })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                value={transferDialog.description}
                onChange={(e) => setTransferDialog({ ...transferDialog, description: e.target.value })}
                multiline
                rows={2}
                placeholder="Virman sebebi"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialog({ ...transferDialog, open: false })}>
            İptal
          </Button>
          <Button
            onClick={handleSubmitTransfer}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'İşleniyor...' : 'Virman Yap'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Transaction Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, transaction: null, password: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Hareketi Sil - Admin Onayı</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
            Bu hareketi silmek kasa bakiyesini etkileyecektir. İşlem geri alınamaz!
          </Alert>
          {deleteDialog.transaction && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Tür:</strong> {deleteDialog.transaction.type === 'income' ? 'Gelir' : 'Gider'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Açıklama:</strong> {deleteDialog.transaction.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tutar:</strong> ₺{deleteDialog.transaction.amount?.toLocaleString('tr-TR')}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            type="password"
            label="Admin Şifresi"
            value={deleteDialog.password}
            onChange={(e) => setDeleteDialog({ ...deleteDialog, password: e.target.value })}
            placeholder="Onaylamak için admin şifrenizi giriniz"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, transaction: null, password: '' })}>
            İptal
          </Button>
          <Button
            onClick={handleDeleteTransaction}
            color="error"
            variant="contained"
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transactions Dialog */}
      <Dialog
        open={transactionsDialog.open}
        onClose={() => setTransactionsDialog({ open: false, cashRegister: null, transactions: [], loading: false })}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Kasa Hareketleri - {transactionsDialog.cashRegister?.name}</span>
          {transactionsDialog.cashRegister && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<Download />}
              onClick={() => {
                window.open(`/api/export/cash-register-transactions/${transactionsDialog.cashRegister._id}`, '_blank');
              }}
            >
              Excel İndir
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {transactionsDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <LoadingSpinner message="Hareketler yükleniyor..." />
            </Box>
          ) : transactionsDialog.transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography color="text.secondary">Henüz hareket bulunmamaktadır</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Tür</TableCell>
                    <TableCell>Açıklama</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                    <TableCell>Notlar</TableCell>
                    <TableCell align="center">İşlem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactionsDialog.transactions.map((transaction) => (
                    <TableRow key={`${transaction.relatedTo}-${transaction._id}`}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.isTransfer
                            ? (transaction.transferDirection === 'in' ? 'Virman Giriş' : 'Virman Çıkış')
                            : (transaction.type === 'income' ? 'Gelir' : 'Gider')}
                          color={transaction.isTransfer
                            ? (transaction.transferDirection === 'in' ? 'info' : 'warning')
                            : (transaction.type === 'income' ? 'success' : 'error')}
                          size="small"
                          icon={transaction.isTransfer ? <SwapHoriz /> : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        {transaction.description}
                        {transaction.isTransfer && transaction.relatedCashRegister && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {transaction.transferDirection === 'in' ? 'Gelen: ' : 'Giden: '}
                            {transaction.relatedCashRegister.name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            color: transaction.type === 'income' ? 'success.main' : 'error.main',
                            fontWeight: 600
                          }}
                        >
                          {transaction.type === 'income' ? '+' : '-'}₺{transaction.amount.toLocaleString('tr-TR')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {transaction.notes || '-'}
                        {transaction.isInvoiced && (
                          <Chip label="Faturalı" size="small" color="info" sx={{ ml: 1 }} />
                        )}
                        {transaction.isAutoGenerated && (
                          <Chip label="Otomatik" size="small" color="default" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteDialog({ open: true, transaction, password: '' })}
                          title="Hareketi Sil"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionsDialog({ open: false, cashRegister: null, transactions: [], loading: false })}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Details Dialog */}
      <Dialog
        open={summaryDialog.open}
        onClose={() => setSummaryDialog({ open: false, type: null, data: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {summaryDialog.type === 'income' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color="success" />
              Gelir Detayları (Gerçekleşen)
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDown color="error" />
              Gider Detayları
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {/* PAID EXPENSES SECTION */}
          {summaryDialog.type === 'expense' && (
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main', fontWeight: 'bold' }}>
              Gerçekleşen Giderler (Kasadan Çıkan)
            </Typography>
          )}
          {summaryDialog.data.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Veri bulunamadı
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kategori</TableCell>
                    <TableCell align="right">Tutar</TableCell>
                    <TableCell align="right">Oran</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaryDialog.data.map((item, index) => {
                    const total = summaryDialog.type === 'income' ? summaryData.totalIncome : summaryData.totalExpense;
                    const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">{item.name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: summaryDialog.type === 'income' ? 'success.main' : 'error.main'
                            }}
                          >
                            ₺{item.amount.toLocaleString('tr-TR')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={parseFloat(percentage)}
                              sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: summaryDialog.type === 'income' ? 'success.main' : 'error.main'
                                }
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              %{percentage}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {summaryDialog.type === 'expense' ? 'Toplam Gerçekleşen' : 'Toplam'}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: summaryDialog.type === 'income' ? 'success.main' : 'error.main'
              }}
            >
              ₺{(summaryDialog.type === 'income' ? summaryData.totalIncome : summaryData.totalExpense).toLocaleString('tr-TR')}
            </Typography>
          </Box>

          {/* EXPECTED EXPENSES SECTION - Only for expense type */}
          {summaryDialog.type === 'expense' && summaryData.expectedExpenseByCategory.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'warning.main', fontWeight: 'bold' }}>
                Beklenen Giderler (Henüz Ödenmemiş)
                {summaryData.expectedExpenseEndDate && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Son vade: {new Date(summaryData.expectedExpenseEndDate).toLocaleDateString('tr-TR')}
                  </Typography>
                )}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Kategori</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell align="right">Oran</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaryData.expectedExpenseByCategory.map((item, index) => {
                      const percentage = summaryData.totalExpectedExpense > 0
                        ? ((item.amount / summaryData.totalExpectedExpense) * 100).toFixed(1) : 0;
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2">{item.name}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                              ₺{item.amount.toLocaleString('tr-TR')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={parseFloat(percentage)}
                                sx={{
                                  width: 60, height: 6, borderRadius: 3, bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': { bgcolor: 'warning.main' }
                                }}
                              />
                              <Typography variant="caption" color="text.secondary">%{percentage}</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Toplam Beklenen</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  ₺{summaryData.totalExpectedExpense.toLocaleString('tr-TR')}
                </Typography>
              </Box>
            </>
          )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialog({ open: false, type: null, data: [] })}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CashRegisters;
