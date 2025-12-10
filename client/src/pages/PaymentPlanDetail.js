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
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Payment, Undo, CreditCard, Money, Receipt, WhatsApp, Email, Send } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import PaymentDialog from '../components/Payment/PaymentDialog';
import EmailDialog from '../components/Email/EmailDialog';
import { sendWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATES, replaceTemplateVariables } from '../utils/whatsappHelper';

const PaymentPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editInstallmentDialog, setEditInstallmentDialog] = useState({
    open: false,
    installment: null,
    formData: {}
  });
  const [paymentDialog, setPaymentDialog] = useState({
    open: false,
    installment: null
  });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [refundDialog, setRefundDialog] = useState({
    open: false,
    installment: null,
    reason: ''
  });
  const [settings, setSettings] = useState(null);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState({
    open: false,
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadPaymentPlan();
  }, [id]);

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

  const getCreditCardCommissionRate = (installmentCount) => {
    if (!settings || !settings.creditCardRates) return 0;
    const rateObj = settings.creditCardRates.find(r => r.installments === installmentCount);
    return rateObj ? rateObj.rate : 0;
  };

  const getVatRate = () => settings?.vatRate || 10;

  const openEditInstallmentDialog = (installment) => {
    setEditInstallmentDialog({
      open: true,
      installment,
      formData: {
        amount: installment.baseAmount || installment.amount || 0,
        dueDate: new Date(installment.dueDate),
        paymentMethod: installment.paymentMethod || 'cash',
        isInvoiced: installment.isInvoiced || false,
        creditCardInstallments: installment.creditCardInstallments || 1
      }
    });
  };

  const calculateInstallmentTotal = (formData) => {
    const amount = parseFloat(formData.amount) || 0;
    let commission = 0;
    let commissionRate = 0;

    if (formData.paymentMethod === 'creditCard') {
      commissionRate = getCreditCardCommissionRate(formData.creditCardInstallments);
      commission = (amount * commissionRate) / 100;
    }

    // Total that student pays = base amount + commission (VAT is NOT added to student's payment)
    const total = amount + commission;

    // VAT is calculated for expense tracking only, not added to student's payment
    const vatRate = getVatRate();
    const vat = formData.isInvoiced ? (total * vatRate) / 100 : 0;

    return { commission, commissionRate, vat, vatRate, total };
  };

  const handleEditInstallment = async () => {
    try {
      const { formData, installment } = editInstallmentDialog;
      const calcs = calculateInstallmentTotal(formData);

      const updatedInstallments = paymentPlan.installments.map(inst => {
        if (inst.installmentNumber === installment.installmentNumber) {
          return {
            ...inst,
            baseAmount: parseFloat(formData.amount) || 0,
            amount: calcs.total,
            dueDate: formData.dueDate,
            paymentMethod: formData.paymentMethod,
            isInvoiced: formData.isInvoiced,
            creditCardInstallments: formData.paymentMethod === 'creditCard' ? formData.creditCardInstallments : undefined,
            commission: calcs.commission,
            commissionRate: calcs.commissionRate,
            vat: calcs.vat,
            vatRate: formData.isInvoiced ? calcs.vatRate : 0
          };
        }
        return inst;
      });

      // Recalculate discountedAmount
      const newDiscountedAmount = updatedInstallments.reduce((sum, inst) => sum + inst.amount, 0);

      await api.put(`/payment-plans/${id}`, {
        installments: updatedInstallments,
        discountedAmount: newDiscountedAmount,
        updatedBy: user?.username
      });

      setSuccess('Taksit güncellendi');
      setEditInstallmentDialog({ open: false, installment: null, formData: {} });
      loadPaymentPlan();
    } catch (error) {
      setError('Taksit güncellenirken hata oluştu');
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

  // Generate notification message with payment plan data
  const getNotificationData = () => {
    const student = paymentPlan.student;
    const paidInstallments = paymentPlan.installments?.filter(i => i.isPaid) || [];
    const unpaidInstallments = paymentPlan.installments?.filter(i => !i.isPaid) || [];
    const nextInstallment = unpaidInstallments[0];

    // Build remaining installments list
    const remainingInstallmentsList = unpaidInstallments.map(inst =>
      `• ${inst.installmentNumber}. Taksit: ${new Date(inst.dueDate).toLocaleDateString('tr-TR')} - ${inst.amount?.toLocaleString('tr-TR')} TL`
    ).join('\n');

    // Build paid installments list
    const paidInstallmentsList = paidInstallments.map(inst =>
      `• ${inst.installmentNumber}. Taksit: ${new Date(inst.paidAt || inst.dueDate).toLocaleDateString('tr-TR')} - ${inst.amount?.toLocaleString('tr-TR')} TL ✓`
    ).join('\n');

    return {
      studentName: `${student.firstName} ${student.lastName}`,
      name: `${student.firstName} ${student.lastName}`,
      totalAmount: paymentPlan.discountedAmount,
      paidAmount: paymentPlan.paidAmount || 0,
      remainingAmount: paymentPlan.remainingAmount || 0,
      courseName: paymentPlan.course?.name || '',
      institutionName: paymentPlan.institution?.name || 'Kurum',
      totalInstallments: paymentPlan.installments?.length || 0,
      paidInstallments: paidInstallments.length,
      remainingInstallments: unpaidInstallments.length,
      remainingInstallmentsList: remainingInstallmentsList || 'Kalan taksit yok',
      paidInstallmentsList: paidInstallmentsList || 'Henüz ödeme yapılmadı',
      // Next installment details
      ...(nextInstallment && {
        amount: nextInstallment.amount,
        dueDate: nextInstallment.dueDate,
        installmentNumber: nextInstallment.installmentNumber,
      })
    };
  };

  // Helper to get phone and recipient name based on defaultNotificationRecipient
  const getNotificationRecipient = () => {
    const student = paymentPlan.student;
    const recipient = student.defaultNotificationRecipient || 'student';
    const mother = student.parentContacts?.find(p => p.relationship === 'Anne');
    const father = student.parentContacts?.find(p => p.relationship === 'Baba');

    let phone = null;
    let recipientName = `${student.firstName} ${student.lastName}`;
    let isParent = false;

    switch (recipient) {
      case 'mother':
        phone = mother?.phone;
        if (mother?.name) {
          recipientName = mother.name;
          isParent = true;
        }
        break;
      case 'father':
        phone = father?.phone;
        if (father?.name) {
          recipientName = father.name;
          isParent = true;
        }
        break;
      default: // 'student'
        phone = student.phone;
        break;
    }

    // Fallback to other numbers if preferred not available
    if (!phone) {
      phone = student.phone || mother?.phone || father?.phone;
      if (phone === mother?.phone && mother?.name) {
        recipientName = mother.name;
        isParent = true;
      } else if (phone === father?.phone && father?.name) {
        recipientName = father.name;
        isParent = true;
      }
    }

    return { phone, recipientName, isParent, studentName: `${student.firstName} ${student.lastName}` };
  };

  const handleWhatsAppNotification = () => {
    const { phone, recipientName, isParent, studentName } = getNotificationRecipient();

    if (!phone) {
      setError('Öğrenci veya velinin telefon numarası bulunamadı');
      return;
    }

    const data = {
      ...getNotificationData(),
      recipientName,
      isParent,
      studentName
    };

    // Use balanceSummary template and replace variables
    const template = DEFAULT_WHATSAPP_TEMPLATES.balanceSummary;
    const message = replaceTemplateVariables(template, data);

    sendWhatsAppMessage(phone, message, {});
    setNotificationDialog(false);
    setSuccess('WhatsApp mesajı açıldı');
  };

  const handleEmailNotification = () => {
    const data = getNotificationData();
    const { recipientName, isParent, studentName } = getNotificationRecipient();

    const greeting = isParent
      ? `Sayın ${recipientName},\n\nÖğrenciniz ${studentName} için ödeme planı durumu:`
      : `Sayın ${studentName},\n\nÖdeme Planı Durumunuz:`;

    const message = `${greeting}

Kurs: ${data.courseName}
Toplam Tutar: ${data.totalAmount?.toLocaleString('tr-TR')} TL
Ödenen: ${data.paidAmount?.toLocaleString('tr-TR')} TL
Kalan: ${data.remainingAmount?.toLocaleString('tr-TR')} TL

${data.dueDate ? `Sonraki Taksit: ${new Date(data.dueDate).toLocaleDateString('tr-TR')} - ${data.amount?.toLocaleString('tr-TR')} TL` : ''}

Sorularınız için bizimle iletişime geçebilirsiniz.

Saygılarımızla,
Fofora Tiyatro`;

    setEmailDialog({
      open: true,
      subject: `Ödeme Planı Durumu - ${studentName}`,
      message
    });
    setNotificationDialog(false);
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

  const editInstallmentCalcs = editInstallmentDialog.formData.amount
    ? calculateInstallmentTotal(editInstallmentDialog.formData)
    : { commission: 0, vat: 0, total: 0 };

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
            variant="contained"
            color="success"
            startIcon={<Send />}
            onClick={() => setNotificationDialog(true)}
          >
            Bildirim Gönder
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
                  paymentPlan.paymentType === 'cashFull' ? 'Tek Seferde' :
                  paymentPlan.paymentType === 'cashInstallment' ? 'Taksitli' :
                  paymentPlan.paymentType === 'mixed' ? 'Karma' :
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

        {(paymentPlan.discountType === 'fullScholarship' || paymentPlan.discountedAmount === 0) ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎓 Tam Burslu Öğrenci
            </Typography>
            <Typography variant="body1">
              Bu öğrenci %100 bursludur. Herhangi bir ödeme alınmasına gerek yoktur.
            </Typography>
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>No</TableCell>
                  <TableCell>Vade</TableCell>
                  <TableCell>Ödeme Şekli</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell align="right">Komisyon</TableCell>
                  <TableCell align="right">
                    <Tooltip title="KDV öğrenciye yansıtılmaz, ödeme alındığında şirket gideri olarak kasadan düşülür">
                      <span>KDV (Gider)</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">Öğrenci Ödemesi</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentPlan.installments?.map((installment) => {
                  const baseAmount = installment.baseAmount || installment.amount || 0;
                  const commission = installment.commission || 0;
                  const vat = installment.vat || 0;
                  const total = installment.amount || 0;

                  return (
                    <TableRow key={installment.installmentNumber}>
                      <TableCell>{installment.installmentNumber}</TableCell>
                      <TableCell>
                        {new Date(installment.dueDate).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          {installment.paymentMethod === 'creditCard' ? (
                            <Tooltip title={`Kredi Kartı ${installment.creditCardInstallments || 1} taksit`}>
                              <Chip
                                icon={<CreditCard sx={{ fontSize: 14 }} />}
                                label={`K.K. ${installment.creditCardInstallments || 1}T`}
                                size="small"
                                color="primary"
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              icon={<Money sx={{ fontSize: 14 }} />}
                              label="Nakit"
                              size="small"
                              color="success"
                            />
                          )}
                          {installment.isInvoiced && (
                            <Tooltip title="Faturalı">
                              <Receipt sx={{ fontSize: 16, color: 'warning.main' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        ₺{baseAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        {commission > 0 ? (
                          <Typography variant="body2" color="warning.main">
                            +₺{commission.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {vat > 0 ? (
                          <Typography variant="body2" color="error.main">
                            +₺{vat.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">
                          ₺{total.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={installment.isPaid ? 'Ödendi' : 'Bekliyor'}
                          color={installment.isPaid ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {!installment.isPaid && (
                          <Tooltip title="Taksiti Düzenle">
                            <IconButton
                              size="small"
                              onClick={() => openEditInstallmentDialog(installment)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!installment.isPaid ? (
                          <Tooltip title="Ödeme Al">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenPaymentDialog(installment)}
                            >
                              <Payment fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="İade Et">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setRefundDialog({
                                open: true,
                                installment: installment,
                                reason: ''
                              })}
                            >
                              <Undo fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* Edit Installment Dialog */}
      <Dialog
        open={editInstallmentDialog.open}
        onClose={() => setEditInstallmentDialog({ open: false, installment: null, formData: {} })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editInstallmentDialog.installment?.installmentNumber}. Taksiti Düzenle
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                  <DatePicker
                    label="Vade Tarihi"
                    value={editInstallmentDialog.formData.dueDate}
                    onChange={(date) => setEditInstallmentDialog(prev => ({
                      ...prev,
                      formData: { ...prev.formData, dueDate: date }
                    }))}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tutar (₺)"
                  type="number"
                  value={editInstallmentDialog.formData.amount || ''}
                  onChange={(e) => setEditInstallmentDialog(prev => ({
                    ...prev,
                    formData: { ...prev.formData, amount: e.target.value }
                  }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Ödeme Şekli</InputLabel>
                  <Select
                    value={editInstallmentDialog.formData.paymentMethod || 'cash'}
                    onChange={(e) => setEditInstallmentDialog(prev => ({
                      ...prev,
                      formData: { ...prev.formData, paymentMethod: e.target.value }
                    }))}
                    label="Ödeme Şekli"
                  >
                    <MenuItem value="cash">Nakit</MenuItem>
                    <MenuItem value="creditCard">Kredi Kartı</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {editInstallmentDialog.formData.paymentMethod === 'creditCard' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>K.K. Taksit</InputLabel>
                    <Select
                      value={editInstallmentDialog.formData.creditCardInstallments || 1}
                      onChange={(e) => setEditInstallmentDialog(prev => ({
                        ...prev,
                        formData: { ...prev.formData, creditCardInstallments: e.target.value }
                      }))}
                      label="K.K. Taksit"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <MenuItem key={num} value={num}>{num} Taksit</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editInstallmentDialog.formData.isInvoiced || false}
                      onChange={(e) => setEditInstallmentDialog(prev => ({
                        ...prev,
                        formData: { ...prev.formData, isInvoiced: e.target.checked }
                      }))}
                    />
                  }
                  label="Faturalı"
                />
              </Grid>

              {/* Hesaplama Özeti */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="subtitle2" gutterBottom>Öğrenci Ödemesi</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Tutar:</Typography>
                      <Typography variant="body2">
                        ₺{(parseFloat(editInstallmentDialog.formData.amount) || 0).toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                    {editInstallmentCalcs.commission > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="warning.main">
                          Komisyon (%{editInstallmentCalcs.commissionRate}):
                        </Typography>
                        <Typography variant="body2" color="warning.main">
                          +₺{editInstallmentCalcs.commission.toLocaleString('tr-TR')}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2">Öğrenciden Tahsil:</Typography>
                      <Typography variant="subtitle2" color="primary">
                        ₺{editInstallmentCalcs.total.toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* KDV Bilgisi - Faturalı ise */}
              {editInstallmentDialog.formData.isInvoiced && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                    <Typography variant="subtitle2" gutterBottom>Şirket Gideri (KDV)</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        KDV (%{getVatRate()}):
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        ₺{editInstallmentCalcs.vat.toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Bu tutar öğrenciye yansıtılmaz, ödeme alındığında kasadan düşülür.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInstallmentDialog({ open: false, installment: null, formData: {} })}>
            İptal
          </Button>
          <Button onClick={handleEditInstallment} variant="contained">
            Kaydet
          </Button>
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
      <Dialog
        open={refundDialog.open}
        onClose={() => setRefundDialog({ open: false, installment: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Taksit İadesi</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
            <Typography variant="body2">
              {refundDialog.installment?.installmentNumber}. taksit için{' '}
              <strong>₺{refundDialog.installment?.paidAmount?.toLocaleString('tr-TR')}</strong> tutarında iade yapılacak.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="İade Sebebi (Opsiyonel)"
            value={refundDialog.reason}
            onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
            placeholder="Örn: Yanlış kasa seçimi"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog({ open: false, installment: null, reason: '' })}>
            İptal
          </Button>
          <Button onClick={handleRefundInstallment} variant="contained" color="warning">
            İade Et
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog
        open={notificationDialog}
        onClose={() => setNotificationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ödeme Planı Bildirimi Gönder</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {paymentPlan.student?.firstName} {paymentPlan.student?.lastName} için ödeme planı durumunu bildirin:
            </Typography>

            <Paper sx={{ p: 2, my: 2, bgcolor: 'grey.50' }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Toplam Tutar</Typography>
                  <Typography variant="body1">₺{paymentPlan.discountedAmount?.toLocaleString('tr-TR')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Ödenen</Typography>
                  <Typography variant="body1" color="success.main">₺{paymentPlan.paidAmount?.toLocaleString('tr-TR') || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Kalan</Typography>
                  <Typography variant="body1" color="error.main">₺{paymentPlan.remainingAmount?.toLocaleString('tr-TR') || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Durum</Typography>
                  <Typography variant="body1">
                    {paymentPlan.isCompleted ? 'Tamamlandı' : `${paymentPlan.installments?.filter(i => i.isPaid).length || 0}/${paymentPlan.installments?.length || 0} Taksit`}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppNotification}
                sx={{
                  bgcolor: '#25D366',
                  '&:hover': { bgcolor: '#128C7E' },
                  flex: 1
                }}
              >
                WhatsApp
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<Email />}
                onClick={handleEmailNotification}
                color="info"
                sx={{ flex: 1 }}
                disabled={!paymentPlan.student?.email}
              >
                Email
              </Button>
            </Box>

            {!paymentPlan.student?.email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                Öğrencinin email adresi kayıtlı değil
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotificationDialog(false)}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <EmailDialog
        open={emailDialog.open}
        onClose={() => setEmailDialog({ open: false, subject: '', message: '' })}
        recipients={paymentPlan.student?.email ? [{
          email: paymentPlan.student.email,
          name: `${paymentPlan.student.firstName} ${paymentPlan.student.lastName}`
        }] : []}
        defaultSubject={emailDialog.subject}
        defaultMessage={emailDialog.message}
        templateData={getNotificationData()}
        onSuccess={() => setSuccess('Email başarıyla gönderildi')}
      />
    </Container>
  );
};

export default PaymentPlanDetail;
