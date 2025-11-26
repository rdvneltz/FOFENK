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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Payment, Undo } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import PaymentDialog from '../components/Payment/PaymentDialog';

const PaymentPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editDateDialog, setEditDateDialog] = useState({ open: false, installment: null });
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    installment: null
  });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editPlanDialog, setEditPlanDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState({
    open: false,
    installment: null,
    reason: ''
  });
  const [editFormData, setEditFormData] = useState({
    totalAmount: '',
    discountType: 'none',
    discountValue: 0,
    isInvoiced: false,
    notes: ''
  });
  const [settings, setSettings] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);

  useEffect(() => {
    loadPaymentPlan();
  }, [id]);

  // Load settings and cash registers after payment plan is loaded
  useEffect(() => {
    if (paymentPlan) {
      loadSettings();
      loadCashRegisters();
    }
  }, [paymentPlan]);

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

  const loadSettings = async () => {
    try {
      const institutionId = paymentPlan?.institution?._id || paymentPlan?.institution;
      if (!institutionId) return;

      const response = await api.get('/settings', {
        params: { institutionId }
      });

      if (response.data && response.data.length > 0) {
        setSettings(response.data[0]);
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  const loadCashRegisters = async () => {
    try {
      const institutionId = paymentPlan?.institution?._id || paymentPlan?.institution;
      if (!institutionId) return;

      const response = await api.get('/cash-registers', {
        params: { institution: institutionId }
      });

      setCashRegisters(response.data);
    } catch (error) {
      console.error('Cash registers load error:', error);
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

  const handlePayInstallment = async (data) => {
    try {
      await api.post(`/payment-plans/${id}/pay-installment`, {
        ...data,
        createdBy: user?.username
      });

      setSuccess(`${data.installmentNumber}. taksit başarıyla ödendi`);
      setPaymentDialog({ open: false, installment: null });
      loadPaymentPlan();
    } catch (error) {
      setError(error.response?.data?.message || 'Ödeme kaydedilirken hata oluştu');
    }
  };

  const handleOpenPaymentDialog = (installment) => {
    setPaymentDialog({
      open: true,
      installment: installment
    });
  };

  const handleRefundInstallment = async () => {
    try {
      const response = await api.post(`/payment-plans/${id}/refund-installment`, {
        installmentNumber: refundDialog.installment.installmentNumber,
        refundReason: refundDialog.reason,
        createdBy: user?.username
      });

      setSuccess(response.data.message || `${refundDialog.installment.installmentNumber}. taksit iade edildi`);
      setRefundDialog({ open: false, installment: null, reason: '' });
      loadPaymentPlan();

      // Show refund details if available
      if (response.data.refundDetails) {
        const details = response.data.refundDetails;
        if (details.reversedExpenses && details.reversedExpenses.length > 0) {
          const expenseList = details.reversedExpenses.map(e => `${e.category}: ₺${e.amount}`).join(', ');
          setSuccess(`${refundDialog.installment.installmentNumber}. taksit iade edildi. İptal edilen giderler: ${expenseList}`);
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'İade işlemi sırasında hata oluştu');
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
      } else if (editFormData.discountType === 'fullScholarship') {
        discountAmount = totalAmount; // %100 indirim - tam burs
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
              {(paymentPlan.discountType === 'fullScholarship' || paymentPlan.discountedAmount === 0) && (
                <Chip label="Tam Burslu (%100)" color="secondary" sx={{ fontWeight: 'bold' }} />
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Taksitler
        </Typography>

        {/* Full Scholarship - Special Message */}
        {(paymentPlan.discountType === 'fullScholarship' || paymentPlan.discountedAmount === 0) ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎓 Tam Burslu Öğrenci
            </Typography>
            <Typography variant="body1">
              Bu öğrenci %100 bursludur. Herhangi bir ödeme alınmasına gerek yoktur.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Toplam Ders Ücreti: ₺{paymentPlan.totalAmount?.toLocaleString('tr-TR')} → Burs İndirimi: %100 → Ödenecek: ₺0
            </Typography>
          </Alert>
        ) : (
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
                  <TableCell>Ödeme Tarihi</TableCell>
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
                      <TableCell>
                        {installment.isPaid && installment.paidDate ?
                          new Date(installment.paidDate).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })
                          : '-'}
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
                        {!installment.isPaid ? (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenPaymentDialog(installment)}
                            title="Ödeme Al"
                          >
                            <Payment />
                          </IconButton>
                        ) : (
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setRefundDialog({
                              open: true,
                              installment: installment,
                              reason: ''
                            })}
                            title="İade Et"
                          >
                            <Undo />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
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
                    onChange={(e) => setEditFormData({ ...editFormData, discountType: e.target.value, discountValue: e.target.value === 'fullScholarship' ? 100 : editFormData.discountValue })}
                    label="İndirim Tipi"
                  >
                    <MenuItem value="none">İndirimsiz</MenuItem>
                    <MenuItem value="percentage">Yüzde (%)</MenuItem>
                    <MenuItem value="fixed">Tutar (₺)</MenuItem>
                    <MenuItem value="fullScholarship">%100 Burslu (Tam Burs)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {editFormData.discountType !== 'none' && editFormData.discountType !== 'fullScholarship' && (
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
              {editFormData.discountType === 'fullScholarship' && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Bu öğrenci %100 bursludur. Tüm ücretler sıfırlanacaktır.
                  </Alert>
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

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        onClose={() => setPaymentDialog({ open: false, installment: null })}
        installment={paymentDialog.installment}
        paymentPlan={paymentPlan}
        cashRegisters={cashRegisters}
        settings={settings}
        onSubmit={handlePayInstallment}
      />

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

      {/* Refund Dialog */}
      <Dialog open={refundDialog.open} onClose={() => setRefundDialog({ open: false, installment: null, reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Taksit İadesi</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2">
              {refundDialog.installment?.installmentNumber}. taksit için{' '}
              <strong>₺{refundDialog.installment?.paidAmount?.toLocaleString('tr-TR')}</strong> tutarında iade yapılacak.
            </Typography>
            <Typography variant="caption">
              Bu işlem ödemeyi geri alır ve taksiti "bekliyor" durumuna döndürür.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="İade Sebebi (Opsiyonel)"
            value={refundDialog.reason}
            onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
            placeholder="Örn: Yanlış kasa seçimi, müşteri talebi"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog({ open: false, installment: null, reason: '' })}>İptal</Button>
          <Button onClick={handleRefundInstallment} variant="contained" color="warning">
            İade Et
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PaymentPlanDetail;
