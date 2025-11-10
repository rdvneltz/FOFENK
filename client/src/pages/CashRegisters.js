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
} from '@mui/material';
import { Add, Edit, AccountBalance, AddCircle, RemoveCircle, SwapHoriz, Receipt, Delete } from '@mui/icons-material';
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

  useEffect(() => {
    if (institution) {
      loadCashRegisters();
    }
  }, [institution]);

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
        userId: currentUser?._id
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
        userId: currentUser?._id
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
        userId: currentUser._id
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

      <Grid container spacing={3}>
        {cashRegisters.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Henüz kasa eklenmedi</Typography>
            </Paper>
          </Grid>
        ) : (
          cashRegisters.map((register) => (
            <Grid item xs={12} sm={6} md={4} key={register._id}>
              <Card elevation={3}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalance color="primary" />
                      <Typography variant="h6">{register.name}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(register)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                  </Box>

                  {register.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {register.description}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Mevcut Bakiye
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Typography variant="h4" color="primary.main">
                        ₺{(register.balance || 0).toLocaleString('tr-TR')}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Bakiye Artır">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleAdjustBalance(register, 'add')}
                          >
                            <AddCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Bakiye Azalt">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleAdjustBalance(register, 'subtract')}
                          >
                            <RemoveCircle />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Başlangıç Bakiyesi
                    </Typography>
                    <Typography variant="body1">
                      ₺{(register.initialBalance || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Receipt />}
                      onClick={() => loadTransactions(register)}
                    >
                      Hareketler
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

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
        <DialogTitle>
          Kasa Hareketleri - {transactionsDialog.cashRegister?.name}
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
                          label={transaction.type === 'income' ? 'Gelir' : 'Gider'}
                          color={transaction.type === 'income' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
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
    </Box>
  );
};

export default CashRegisters;
