import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Payment } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';

const PaymentPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editDateDialog, setEditDateDialog] = useState({ open: false, installment: null });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, installment: null });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editPlanDialog, setEditPlanDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    totalAmount: '',
    discountType: 'none',
    discountValue: 0,
    isInvoiced: false,
    notes: ''
  });

  useEffect(() => {
    loadPaymentPlan();
  }, [id]);

  const loadPaymentPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payment-plans/${id}`);
      setPaymentPlan(response.data);
    } catch (error) {
      setError('Ödeme planı yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDate = async () => {
    try {
      const updatedInstallments = paymentPlan.installments.map(inst =>
        inst.installmentNumber === editDateDialog.installment.installmentNumber
          ? { ...inst, dueDate: editDateDialog.newDate }
          : inst
      );

      await api.put(`/payment-plans/${id}`, {
        installments: updatedInstallments,
        updatedBy: user?.username
      });

      setSuccess('Vade tarihi güncellendi');
      setEditDateDialog({ open: false, installment: null });
      loadPaymentPlan();
    } catch (error) {
      setError('Vade tarihi güncellenirken hata oluştu');
    }
  };

  const handlePayment = async () => {
    try {
      const installment = paymentDialog.installment;
      let paymentAmount = parseFloat(paymentDialog.amount);

      // Get student ID properly
      const studentId = paymentPlan.student?._id || paymentPlan.student;
      const courseId = paymentPlan.course?._id || paymentPlan.course;
      const institutionId = paymentPlan.institution?._id || paymentPlan.institution;
      const seasonId = paymentPlan.season?._id || paymentPlan.season;

      // Get cash registers to get default one
      const cashRegResponse = await api.get('/cash-registers', {
        params: { institution: institutionId }
      });
      const defaultCashRegister = cashRegResponse.data[0];

      if (!defaultCashRegister) {
        setError('Kasa bulunamadı. Lütfen önce bir kasa oluşturun.');
        return;
      }

      // Create payment record
      await api.post('/payments', {
        student: studentId,
        course: courseId,
        amount: paymentAmount,
        paymentDate: new Date(),
        paymentType: paymentPlan.paymentType === 'creditCard' ? 'creditCard' : 'cash',
        cashRegister: defaultCashRegister._id,
        notes: `${paymentPlan.course?.name || 'Ders'} - ${installment.installmentNumber}. Taksit`,
        institution: institutionId,
        season: seasonId,
        createdBy: user?.username || 'System'
      });

      // Update installments with overpayment cascade
      const updatedInstallments = [...paymentPlan.installments];
      let remainingPayment = paymentAmount;

      // Find the current installment index
      const currentIndex = updatedInstallments.findIndex(
        inst => inst.installmentNumber === installment.installmentNumber
      );

      // Apply payment starting from current installment and cascade to next ones
      for (let i = currentIndex; i < updatedInstallments.length && remainingPayment > 0; i++) {
        const inst = updatedInstallments[i];
        const currentPaid = inst.paidAmount || 0;
        const remaining = inst.amount - currentPaid;

        if (remaining > 0) {
          const paymentForThisInstallment = Math.min(remainingPayment, remaining);
          inst.paidAmount = currentPaid + paymentForThisInstallment;
          inst.isPaid = inst.paidAmount >= inst.amount;

          if (inst.isPaid && !inst.paidDate) {
            inst.paidDate = new Date();
          }

          remainingPayment -= paymentForThisInstallment;
        }
      }

      const totalPaid = updatedInstallments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
      const isCompleted = totalPaid >= paymentPlan.discountedAmount;

      await api.put(`/payment-plans/${id}`, {
        installments: updatedInstallments,
        paidAmount: totalPaid,
        isCompleted: isCompleted,
        updatedBy: user?.username
      });

      if (remainingPayment > 0) {
        setSuccess(`Ödeme kaydedildi. ${remainingPayment.toFixed(2)} TL fazla ödeme yapıldı ve sonraki taksitlere uygulandı.`);
      } else {
        setSuccess('Ödeme kaydedildi');
      }

      setPaymentDialog({ open: false, installment: null });
      loadPaymentPlan();
    } catch (error) {
      setError(error.response?.data?.message || 'Ödeme kaydedilirken hata oluştu');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/payment-plans/${id}`);
      navigate(`/students/${paymentPlan.student._id}`);
    } catch (error) {
      setError('Ödeme planı silinirken hata oluştu');
    }
  };

  const openEditDialog = () => {
    setEditFormData({
      totalAmount: paymentPlan.totalAmount || '',
      discountType: paymentPlan.discountType || 'none',
      discountValue: paymentPlan.discountValue || 0,
      isInvoiced: paymentPlan.isInvoiced || false,
      notes: paymentPlan.notes || ''
    });
    setEditPlanDialog(true);
  };

  const handleEditPlan = async () => {
    try {
      const totalAmount = parseFloat(editFormData.totalAmount);

      // Calculate discount
      let discountAmount = 0;
      if (editFormData.discountType === 'percentage') {
        discountAmount = (totalAmount * parseFloat(editFormData.discountValue)) / 100;
      } else if (editFormData.discountType === 'fixed') {
        discountAmount = parseFloat(editFormData.discountValue) || 0;
      }

      let discountedAmount = totalAmount - discountAmount;

      // Recalculate installment amounts based on new total
      const installmentCount = paymentPlan.installments.length;
      const installmentAmount = discountedAmount / installmentCount;

      const updatedInstallments = paymentPlan.installments.map((inst) => ({
        ...inst,
        amount: installmentAmount
      }));

      await api.put(`/payment-plans/${id}`, {
        totalAmount: totalAmount,
        discountedAmount: discountedAmount,
        installments: updatedInstallments,
        isInvoiced: editFormData.isInvoiced,
        notes: editFormData.notes,
        updatedBy: user?.username
      });

      setSuccess('Ödeme planı güncellendi');
      setEditPlanDialog(false);
      loadPaymentPlan();
    } catch (error) {
      setError('Ödeme planı güncellenirken hata oluştu');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Ödeme planı yükleniyor..." />;
  }

  if (!paymentPlan) {
    return (
      <Container>
        <Alert severity="error">Ödeme planı bulunamadı</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/students/${paymentPlan.student?._id || paymentPlan.student}`)}
        >
          Geri
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={openEditDialog}
          >
            Planı Düzenle
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialog(true)}
          >
            Ödeme Planını Sil
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Ödeme Planı Detayı
        </Typography>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Öğrenci</Typography>
            <Typography variant="h6">
              {paymentPlan.student.firstName} {paymentPlan.student.lastName}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Ders</Typography>
            <Typography variant="h6">{paymentPlan.course.name}</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Toplam Tutar</Typography>
            <Typography variant="body1">₺{paymentPlan.totalAmount?.toLocaleString('tr-TR')}</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Ödenecek Tutar</Typography>
            <Typography variant="body1" fontWeight="bold">
              ₺{paymentPlan.discountedAmount?.toLocaleString('tr-TR')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Ödenen</Typography>
            <Typography variant="body1" color="success.main">
              ₺{paymentPlan.paidAmount?.toLocaleString('tr-TR') || 0}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Kalan</Typography>
            <Typography variant="body1" color="error.main">
              ₺{paymentPlan.remainingAmount?.toLocaleString('tr-TR') || 0}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={
                  paymentPlan.paymentType === 'cashFull' ? 'Nakit Peşin' :
                  paymentPlan.paymentType === 'cashInstallment' ? 'Nakit Taksitli' :
                  'Kredi Kartı'
                }
              />
              {paymentPlan.isInvoiced && <Chip label="Faturalı" color="info" />}
              {paymentPlan.isCompleted && <Chip label="Tamamlandı" color="success" />}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Taksitler
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Taksit No</TableCell>
                <TableCell>Vade Tarihi</TableCell>
                <TableCell align="right">Tutar</TableCell>
                <TableCell align="right">Ödenen</TableCell>
                <TableCell align="right">Kalan</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentPlan.installments?.map((installment) => {
                const remaining = installment.amount - (installment.paidAmount || 0);
                return (
                  <TableRow key={installment.installmentNumber}>
                    <TableCell>{installment.installmentNumber}</TableCell>
                    <TableCell>
                      {new Date(installment.dueDate).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell align="right">
                      ₺{installment.amount?.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right">
                      ₺{(installment.paidAmount || 0).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right">
                      ₺{remaining.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={installment.isPaid ? 'Ödendi' : 'Bekliyor'}
                        color={installment.isPaid ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => setEditDateDialog({
                          open: true,
                          installment,
                          newDate: new Date(installment.dueDate)
                        })}
                        title="Vade Tarihini Düzenle"
                      >
                        <Edit />
                      </IconButton>
                      {!installment.isPaid && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setPaymentDialog({
                            open: true,
                            installment,
                            amount: remaining.toFixed(2)
                          })}
                          title="Ödeme Al"
                        >
                          <Payment />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Date Dialog */}
      <Dialog open={editDateDialog.open} onClose={() => setEditDateDialog({ open: false, installment: null })}>
        <DialogTitle>Vade Tarihini Düzenle</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <DatePicker
                label="Yeni Vade Tarihi"
                value={editDateDialog.newDate}
                onChange={(date) => setEditDateDialog({ ...editDateDialog, newDate: date })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDateDialog({ open: false, installment: null })}>İptal</Button>
          <Button onClick={handleEditDate} variant="contained">Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog.open} onClose={() => setPaymentDialog({ open: false, installment: null })}>
        <DialogTitle>Ödeme Al</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {paymentDialog.installment?.installmentNumber}. Taksit
            </Typography>
            <TextField
              fullWidth
              label="Ödeme Tutarı (₺)"
              type="number"
              value={paymentDialog.amount}
              onChange={(e) => setPaymentDialog({ ...paymentDialog, amount: e.target.value })}
              sx={{ mt: 2 }}
              inputProps={{
                min: 0
              }}
              helperText="Fazla ödeme yapılması durumunda kalan tutar sonraki taksitlere otomatik olarak aktarılır"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ open: false, installment: null })}>İptal</Button>
          <Button onClick={handlePayment} variant="contained" color="primary">
            Ödemeyi Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanDialog} onClose={() => setEditPlanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ödeme Planını Düzenle</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Toplam Tutar (₺)"
                  type="number"
                  value={editFormData.totalAmount}
                  onChange={(e) => setEditFormData({ ...editFormData, totalAmount: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>İndirim Tipi</InputLabel>
                  <Select
                    value={editFormData.discountType}
                    onChange={(e) => setEditFormData({ ...editFormData, discountType: e.target.value })}
                    label="İndirim Tipi"
                  >
                    <MenuItem value="none">İndirimsiz</MenuItem>
                    <MenuItem value="percentage">Yüzde (%)</MenuItem>
                    <MenuItem value="fixed">Tutar (₺)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {editFormData.discountType !== 'none' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={editFormData.discountType === 'percentage' ? 'İndirim Yüzdesi (%)' : 'İndirim Tutarı (₺)'}
                    type="number"
                    value={editFormData.discountValue}
                    onChange={(e) => setEditFormData({ ...editFormData, discountValue: e.target.value })}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Fatura</InputLabel>
                  <Select
                    value={editFormData.isInvoiced}
                    onChange={(e) => setEditFormData({ ...editFormData, isInvoiced: e.target.value === 'true' })}
                    label="Fatura"
                  >
                    <MenuItem value={false}>Faturasız</MenuItem>
                    <MenuItem value={true}>Faturalı</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notlar"
                  multiline
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditPlanDialog(false)}>İptal</Button>
          <Button onClick={handleEditPlan} variant="contained">Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Ödeme Planını Sil"
        message="Bu ödeme planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        confirmColor="error"
      />
    </Container>
  );
};

export default PaymentPlanDetail;
