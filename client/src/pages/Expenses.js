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
} from '@mui/material';
import { Add, Edit, Delete, FileDownload } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { exportExpenses } from '../utils/exportHelpers';

const EXPENSE_CATEGORIES = [
  'Eğitmen Ödemesi',
  'Maaş',
  'Kira',
  'Elektrik',
  'Su',
  'İnternet',
  'Malzeme',
  'Temizlik',
  'Bakım-Onarım',
  'Diğer',
];

const Expenses = () => {
  const { institution, season, currentUser, user } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expenses, setExpenses] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    expenseDate: new Date().toISOString().split('T')[0],
    cashRegister: '',
    instructor: '',
  });

  // Admin approval dialog for delete
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    expense: null,
    password: ''
  });

  useEffect(() => {
    if (institution && season) {
      loadData();
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesRes, cashRes, instructorsRes] = await Promise.all([
        api.get('/expenses', {
          params: {
            institution: institution._id,
            season: season._id,
          },
        }),
        api.get('/cash-registers', {
          params: { institution: institution._id },
        }),
        api.get('/instructors', {
          params: {
            institutionId: institution._id,
            seasonId: season._id,
          },
        }),
      ]);
      setExpenses(expensesRes.data);
      setCashRegisters(cashRes.data);
      setInstructors(instructorsRes.data);
      if (cashRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, cashRegister: cashRes.data[0]._id }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        description: expense.description || '',
        amount: expense.amount || '',
        category: expense.category || '',
        expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : '',
        cashRegister: expense.cashRegister?._id || '',
        instructor: expense.instructor?._id || '',
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        description: '',
        amount: '',
        category: '',
        expenseDate: new Date().toISOString().split('T')[0],
        cashRegister: cashRegisters[0]?._id || '',
        instructor: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedExpense(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const expenseData = {
        ...formData,
        institution: institution._id,
        season: season._id,
        amount: parseFloat(formData.amount),
        createdBy: currentUser?.username || user,
        updatedBy: currentUser?.username || user,
      };

      if (selectedExpense) {
        await api.put(`/expenses/${selectedExpense._id}`, expenseData);
      } else {
        await api.post('/expenses', expenseData);
      }

      await loadData();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/expenses/${selectedExpense._id}`);
      await loadData();
      setOpenConfirm(false);
      setSelectedExpense(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  const handleDeleteWithApproval = async () => {
    try {
      if (!deleteDialog.password) {
        setError('Lütfen admin şifrenizi giriniz');
        return;
      }

      await api.post(`/cash-registers/transactions/${deleteDialog.expense._id}/delete`, {
        password: deleteDialog.password,
        transactionType: 'Expense',
        userId: currentUser._id
      });

      setError('');
      alert('Gider başarıyla silindi');
      setDeleteDialog({ open: false, expense: null, password: '' });
      await loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi sırasında hata oluştu');
    }
  };

  const filteredExpenses = expenses.filter((expense) =>
    filterCategory === 'all' ? true : expense.category === filterCategory
  );

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

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const handleExportToExcel = async () => {
    try {
      await exportExpenses({
        institutionId: institution._id,
        seasonId: season._id,
      });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  return (
    <Box sx={{ pb: { xs: 10, md: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 3 } }}>
        <Typography variant={isMobile ? 'h5' : 'h4'}>Giderler</Typography>
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExportToExcel}>
              Excel'e Aktar
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
              Yeni Gider
            </Button>
          </Box>
        )}
      </Box>

      <Paper sx={{ p: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 3 } }}>
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
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
              <Typography variant={isMobile ? 'h6' : 'h5'} color="error.main" fontWeight="bold">
                Toplam: ₺{totalExpenses.toLocaleString('tr-TR')}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Mobile Card View */}
      {isMobile ? (
        <Box>
          {filteredExpenses.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">Henüz gider kaydı yok</Typography>
            </Paper>
          ) : (
            <Grid container spacing={1.5}>
              {filteredExpenses.map((expense) => (
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
                          ₺{expense.amount.toLocaleString('tr-TR')}
                        </Typography>
                        {expense.instructor && (
                          <Typography variant="caption" color="text.secondary">
                            {expense.instructor.firstName} {expense.instructor.lastName}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          {/* Floating Action Button for Mobile */}
          <Fab color="primary" sx={{ position: 'fixed', bottom: 72, right: 16 }} onClick={() => handleOpenDialog()}>
            <Add />
          </Fab>
        </Box>
      ) : (
        /* Desktop Table View */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Açıklama</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Eğitmen</TableCell>
                <TableCell>Tutar</TableCell>
                <TableCell>Kasa</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">Henüz gider kaydı yok</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell>
                      {new Date(expense.expenseDate).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      <Chip label={expense.category} size="small" />
                    </TableCell>
                    <TableCell>
                      {expense.instructor ? (
                        <Typography variant="body2">
                          {expense.instructor.firstName} {expense.instructor.lastName}
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography color="error.main" sx={{ fontWeight: 'bold' }}>
                        ₺{expense.amount.toLocaleString('tr-TR')}
                      </Typography>
                    </TableCell>
                    <TableCell>{expense.cashRegister?.name || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(expense)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteDialog({ open: true, expense, password: '' })}
                        color="error"
                        title="Sil"
                      >
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{selectedExpense ? 'Gider Düzenle' : 'Yeni Gider'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Açıklama"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tutar (₺)"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Kategori</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
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
              {formData.category === 'Eğitmen Ödemesi' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Eğitmen</InputLabel>
                    <Select
                      name="instructor"
                      value={formData.instructor}
                      onChange={handleChange}
                      label="Eğitmen"
                    >
                      {instructors.map((instructor) => (
                        <MenuItem key={instructor._id} value={instructor._id}>
                          {instructor.firstName} {instructor.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tarih"
                  name="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Kasa</InputLabel>
                  <Select
                    name="cashRegister"
                    value={formData.cashRegister}
                    onChange={handleChange}
                    label="Kasa"
                  >
                    {cashRegisters.map((register) => (
                      <MenuItem key={register._id} value={register._id}>
                        {register.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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

      {/* Delete Expense Confirmation Dialog with Admin Approval */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, expense: null, password: '' })}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Gideri Sil - Admin Onayı</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 2 }}>
            Bu gideri silmek kasa bakiyesini etkileyecektir. İşlem geri alınamaz!
          </Alert>
          {deleteDialog.expense && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Kategori:</strong> {deleteDialog.expense.category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Açıklama:</strong> {deleteDialog.expense.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tutar:</strong> ₺{deleteDialog.expense.amount?.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tarih:</strong> {new Date(deleteDialog.expense.expenseDate).toLocaleDateString('tr-TR')}
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
          <Button onClick={() => setDeleteDialog({ open: false, expense: null, password: '' })}>
            İptal
          </Button>
          <Button
            onClick={handleDeleteWithApproval}
            color="error"
            variant="contained"
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
