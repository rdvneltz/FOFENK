import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Divider,
  Alert,
  Grid,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';

const PaymentDialog = ({ open, onClose, installment, paymentPlan, cashRegisters, defaultIncomeCashRegister, settings, onSubmit }) => {
  const [formData, setFormData] = useState({
    amount: '',
    cashRegisterId: '',
    isInvoiced: false,
    paymentDate: new Date(),
    customVatRate: '', // Custom VAT rate input
  });
  const [error, setError] = useState('');
  const [overpaymentOption, setOverpaymentOption] = useState('next'); // 'next' or 'distribute'

  // Check if installment already has VAT and commission configured
  const hasPreConfiguredVat = installment?.isInvoiced && installment?.vat > 0;
  const hasPreConfiguredCommission = installment?.paymentMethod === 'creditCard' && installment?.commission > 0;

  // Calculate remaining amount for partial payments
  const installmentPaidAmount = installment?.paidAmount || 0;
  const installmentTotalAmount = installment?.amount || 0;
  const installmentRemainingAmount = installmentTotalAmount - installmentPaidAmount;
  const isPartiallyPaid = installmentPaidAmount > 0 && installmentPaidAmount < installmentTotalAmount;

  // Check if this is the last unpaid installment
  const unpaidInstallments = paymentPlan?.installments?.filter(inst => !inst.isPaid) || [];
  const isLastInstallment = unpaidInstallments.length === 1 &&
    unpaidInstallments[0]?.installmentNumber === installment?.installmentNumber;

  useEffect(() => {
    if (installment) {
      // Default amount is remaining amount (for partial payments support)
      const remainingAmount = (installment.amount || 0) - (installment.paidAmount || 0);

      // Use default income cash register if available, otherwise fall back to first
      const activeCashRegisters = cashRegisters.filter(r => r.isActive !== false);
      let defaultCashRegisterId = '';
      if (defaultIncomeCashRegister && activeCashRegisters.find(r => r._id === defaultIncomeCashRegister)) {
        defaultCashRegisterId = defaultIncomeCashRegister;
      } else if (activeCashRegisters.length > 0) {
        defaultCashRegisterId = activeCashRegisters[0]._id;
      }

      setFormData({
        amount: remainingAmount.toString(),
        cashRegisterId: defaultCashRegisterId,
        isInvoiced: installment.isInvoiced || false,
        paymentDate: new Date(),
        customVatRate: settings?.vatRate?.toString() || '10', // Default from settings
      });
      setOverpaymentOption('next');
    }
  }, [installment, cashRegisters, defaultIncomeCashRegister, settings]);

  // Calculate overpayment and remaining installments
  const overpaymentInfo = useMemo(() => {
    if (!installment || !paymentPlan) return null;

    const enteredAmount = parseFloat(formData.amount) || 0;
    // Use remaining amount instead of total amount for partial payments
    const remainingForThisInstallment = (installment.amount || 0) - (installment.paidAmount || 0);
    const excess = enteredAmount - remainingForThisInstallment;

    if (excess <= 0) return null;

    // Find remaining unpaid installments (excluding current)
    const remainingInstallments = paymentPlan.installments?.filter(
      inst => !inst.isPaid && inst.installmentNumber !== installment.installmentNumber
    ) || [];

    if (remainingInstallments.length === 0) {
      return {
        excess,
        hasRemainingInstallments: false,
        message: 'Fazla ödeme var ama başka taksit kalmadı. Fazla tutar öğrenci bakiyesine yansıyacak.'
      };
    }

    // Option 1: Apply to next installment
    const nextInstallment = remainingInstallments[0];
    const nextInstallmentNewAmount = Math.max(0, (nextInstallment?.amount || 0) - excess);

    // Option 2: Distribute across all remaining
    const totalRemaining = remainingInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const newTotalRemaining = Math.max(0, totalRemaining - excess);
    const distributedAmount = remainingInstallments.length > 0
      ? newTotalRemaining / remainingInstallments.length
      : 0;

    return {
      excess,
      hasRemainingInstallments: true,
      remainingInstallments,
      nextInstallment,
      nextInstallmentNewAmount,
      distributedAmount,
      totalRemaining,
      newTotalRemaining
    };
  }, [formData.amount, installment, paymentPlan]);

  const handleSubmit = () => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Lütfen geçerli bir tutar girin');
      return;
    }

    if (!formData.cashRegisterId) {
      setError('Lütfen bir kasa seçin');
      return;
    }

    // Validate VAT rate if invoiced and NOT pre-configured
    if (formData.isInvoiced && !hasPreConfiguredVat) {
      const rate = parseFloat(formData.customVatRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        setError('Lütfen geçerli bir KDV oranı girin (0-100 arası)');
        return;
      }
    }

    const finalVatRate = parseFloat(formData.customVatRate) || 10;

    onSubmit({
      installmentNumber: installment.installmentNumber,
      amount: amount,
      cashRegisterId: formData.cashRegisterId,
      isInvoiced: formData.isInvoiced,
      paymentDate: formData.paymentDate,
      // If VAT is pre-configured, pass the existing VAT amount instead of rate for recalculation
      vatRate: hasPreConfiguredVat ? undefined : (formData.isInvoiced ? finalVatRate : undefined),
      preConfiguredVat: hasPreConfiguredVat ? installment.vat : undefined,
      // Pass commission info for pre-configured credit card payments
      preConfiguredCommission: hasPreConfiguredCommission ? installment.commission : undefined,
      preConfiguredCommissionRate: hasPreConfiguredCommission ? installment.commissionRate : undefined,
      installmentPaymentMethod: installment.paymentMethod,
      installmentCreditCardInstallments: installment.creditCardInstallments,
      // Overpayment handling
      overpaymentHandling: overpaymentInfo?.hasRemainingInstallments ? overpaymentOption : null,
      excessAmount: overpaymentInfo?.excess || 0
    });

    setError('');
  };

  const amount = parseFloat(formData.amount) || 0;
  const currentVatRate = parseFloat(formData.customVatRate) || 10;
  // Only calculate new VAT if not pre-configured
  const calculatedVat = (formData.isInvoiced && !hasPreConfiguredVat)
    ? (amount * currentVatRate) / 100
    : 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {installment?.installmentNumber}. Taksit Ödemesi
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Partial Payment Info */}
          {isPartiallyPaid && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                ℹ️ Bu taksit için daha önce kısmi ödeme yapılmış
              </Typography>
              <Typography variant="body2">
                Taksit Tutarı: ₺{installmentTotalAmount.toLocaleString('tr-TR')} |
                Ödenen: ₺{installmentPaidAmount.toLocaleString('tr-TR')} |
                <strong> Kalan: ₺{installmentRemainingAmount.toLocaleString('tr-TR')}</strong>
              </Typography>
            </Alert>
          )}

          {/* Last Installment Warning */}
          {isLastInstallment && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                ⚠️ Bu son taksittir. Kalan tutardan fazla ödeme yapılamaz.
                Maksimum ödeme: <strong>₺{installmentRemainingAmount.toLocaleString('tr-TR')}</strong>
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ödeme Tutarı (₺)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                inputProps={{
                  min: 0,
                  step: 0.01,
                  max: isLastInstallment ? installmentRemainingAmount : undefined
                }}
                helperText={
                  isPartiallyPaid
                    ? `Kalan tutar: ₺${installmentRemainingAmount.toLocaleString('tr-TR')} (Toplam: ₺${installmentTotalAmount.toLocaleString('tr-TR')})`
                    : `Taksit tutarı: ₺${installmentTotalAmount.toLocaleString('tr-TR')}`
                }
                error={isLastInstallment && parseFloat(formData.amount) > installmentRemainingAmount}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Kasa</InputLabel>
                <Select
                  value={formData.cashRegisterId}
                  onChange={(e) => setFormData({ ...formData, cashRegisterId: e.target.value })}
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

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                  label="Ödeme Tarihi"
                  value={formData.paymentDate}
                  onChange={(date) => setFormData({ ...formData, paymentDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isInvoiced}
                    onChange={(e) => setFormData({ ...formData, isInvoiced: e.target.checked })}
                    disabled={hasPreConfiguredVat}
                  />
                }
                label={hasPreConfiguredVat
                  ? `Faturalı (KDV dahil: ₺${installment?.vat?.toLocaleString('tr-TR')})`
                  : 'Faturalı'
                }
              />
            </Grid>

            {/* Editable VAT Rate - only show when invoiced and not pre-configured */}
            {formData.isInvoiced && !hasPreConfiguredVat && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="KDV Oranı (%)"
                  type="number"
                  value={formData.customVatRate}
                  onChange={(e) => setFormData({ ...formData, customVatRate: e.target.value })}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                  helperText={`Varsayılan: %${settings?.vatRate || 10}`}
                  size="small"
                />
              </Grid>
            )}

            {/* Show pre-configured payment info if exists */}
            {(hasPreConfiguredVat || hasPreConfiguredCommission) && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    ℹ️ Bu taksit için önceden yapılandırılmış ödeme bilgisi:
                  </Typography>
                  <Typography variant="body2">
                    Ana tutar: ₺{(installment?.baseAmount || 0).toLocaleString('tr-TR')}
                  </Typography>
                  {hasPreConfiguredCommission && (
                    <Typography variant="body2" color="warning.main">
                      Komisyon (%{installment?.commissionRate}): +₺{installment?.commission?.toLocaleString('tr-TR')}
                    </Typography>
                  )}
                  {hasPreConfiguredVat && (
                    <Typography variant="body2" color="error.main">
                      KDV (%{installment?.vatRate}): +₺{installment?.vat?.toLocaleString('tr-TR')}
                    </Typography>
                  )}
                  <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                    Toplam: ₺{amount.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {hasPreConfiguredVat && '(KDV gider olarak kaydedilecek ve kasadan düşülecektir)'}
                    {hasPreConfiguredVat && hasPreConfiguredCommission && ' '}
                    {hasPreConfiguredCommission && '(Komisyon gider olarak kaydedilecek ve kasadan düşülecektir)'}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Only show VAT calculation for non-preconfigured invoiced payments */}
            {formData.isInvoiced && !hasPreConfiguredVat && (
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    KDV Hesaplaması:
                  </Typography>
                  <Typography variant="body2">
                    Ödeme: ₺{amount.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    KDV (%{currentVatRate}): ₺{calculatedVat.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (KDV gider olarak kaydedilecek ve kasadan düşülecektir)
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Overpayment Handling */}
            {overpaymentInfo && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    💰 Fazla Ödeme Tespit Edildi!
                  </Typography>
                  <Typography variant="body2">
                    Taksit tutarı: ₺{(installment?.amount || 0).toLocaleString('tr-TR')} |
                    Girilen tutar: ₺{amount.toLocaleString('tr-TR')} |
                    <strong> Fazla: ₺{overpaymentInfo.excess.toLocaleString('tr-TR')}</strong>
                  </Typography>
                </Alert>

                {overpaymentInfo.hasRemainingInstallments ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Fazla ödeme nasıl dağıtılsın?
                    </Typography>

                    <RadioGroup
                      value={overpaymentOption}
                      onChange={(e) => setOverpaymentOption(e.target.value)}
                    >
                      {/* Option 1: Apply to next installment */}
                      <Paper variant="outlined" sx={{ p: 2, mb: 2, cursor: 'pointer' }} onClick={() => setOverpaymentOption('next')}>
                        <FormControlLabel
                          value="next"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                Seçenek 1: Sonraki Taksite Uygula
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ₺{overpaymentInfo.excess.toLocaleString('tr-TR')} fazla ödeme {overpaymentInfo.nextInstallment?.installmentNumber}. taksitten düşülecek
                              </Typography>
                              <Box sx={{ mt: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                                <Typography variant="body2">
                                  <strong>{overpaymentInfo.nextInstallment?.installmentNumber}. Taksit:</strong>{' '}
                                  <s>₺{(overpaymentInfo.nextInstallment?.amount || 0).toLocaleString('tr-TR')}</s>{' '}
                                  → <strong>₺{overpaymentInfo.nextInstallmentNewAmount.toLocaleString('tr-TR')}</strong>
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </Paper>

                      {/* Option 2: Distribute across all */}
                      <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => setOverpaymentOption('distribute')}>
                        <FormControlLabel
                          value="distribute"
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                Seçenek 2: Tüm Taksitlere Dağıt
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ₺{overpaymentInfo.excess.toLocaleString('tr-TR')} fazla ödeme kalan {overpaymentInfo.remainingInstallments.length} taksite eşit dağıtılacak
                              </Typography>
                              <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Taksit</TableCell>
                                      <TableCell align="right">Eski Tutar</TableCell>
                                      <TableCell align="right">Yeni Tutar</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {overpaymentInfo.remainingInstallments.map((inst) => (
                                      <TableRow key={inst.installmentNumber}>
                                        <TableCell>{inst.installmentNumber}. Taksit</TableCell>
                                        <TableCell align="right">
                                          <s>₺{(inst.amount || 0).toLocaleString('tr-TR')}</s>
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                          ₺{overpaymentInfo.distributedAmount.toLocaleString('tr-TR')}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Box>
                          }
                        />
                      </Paper>
                    </RadioGroup>
                  </Box>
                ) : (
                  <Alert severity="warning">
                    {overpaymentInfo.message}
                  </Alert>
                )}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained">
            Ödemeyi Kaydet
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
};

export default PaymentDialog;
