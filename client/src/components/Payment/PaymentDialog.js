import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';

const PaymentDialog = ({ open, onClose, installment, paymentPlan, cashRegisters, settings, onSubmit }) => {
  const [formData, setFormData] = useState({
    amount: '',
    cashRegisterId: '',
    isInvoiced: false,
    paymentDate: new Date(),
  });
  const [vatRate, setVatRate] = useState(null);
  const [rateDialog, setRateDialog] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (installment) {
      setFormData({
        amount: installment.amount.toString(),
        cashRegisterId: cashRegisters.length > 0 ? cashRegisters[0]._id : '',
        isInvoiced: installment.isInvoiced || false,
        paymentDate: new Date(),
      });
    }
  }, [installment, cashRegisters]);

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

    // Check for VAT rate if invoiced
    if (formData.isInvoiced) {
      const rate = settings?.vatRate;
      if (rate === undefined || rate === null) {
        setRateDialog(true);
        return;
      }
    }

    const finalVatRate = vatRate !== null ? vatRate : (settings?.vatRate || 10);

    onSubmit({
      installmentNumber: installment.installmentNumber,
      amount: amount,
      cashRegisterId: formData.cashRegisterId,
      isInvoiced: formData.isInvoiced,
      paymentDate: formData.paymentDate,
      vatRate: formData.isInvoiced ? finalVatRate : undefined,
    });

    setError('');
  };

  const handleRateDialogSubmit = () => {
    const rate = parseFloat(vatRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('Lütfen geçerli bir KDV oranı girin (0-100 arası)');
      return;
    }
    setRateDialog(false);
    // Submit after rate is set
    setTimeout(() => handleSubmit(), 100);
  };

  const amount = parseFloat(formData.amount) || 0;
  const calculatedVat = formData.isInvoiced ? (amount * (vatRate !== null ? vatRate : (settings?.vatRate || 10))) / 100 : 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {installment?.installmentNumber}. Taksit Ödemesi
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ödeme Tutarı (₺)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12}>
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

            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                  label="Ödeme Tarihi"
                  value={formData.paymentDate}
                  onChange={(date) => setFormData({ ...formData, paymentDate: date })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isInvoiced}
                    onChange={(e) => setFormData({ ...formData, isInvoiced: e.target.checked })}
                  />
                }
                label={`Faturalı (KDV %${vatRate !== null ? vatRate : (settings?.vatRate || 10)})`}
              />
            </Grid>

            {formData.isInvoiced && (
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    KDV Hesaplaması:
                  </Typography>
                  <Typography variant="body2">
                    Ödeme: ₺{amount.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    KDV (%{vatRate !== null ? vatRate : (settings?.vatRate || 10)}): ₺{calculatedVat.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (KDV gider olarak kaydedilecek ve kasadan düşülecektir)
                  </Typography>
                </Box>
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

      {/* VAT Rate Dialog */}
      <Dialog open={rateDialog} onClose={() => setRateDialog(false)}>
        <DialogTitle>KDV Oranı Tanımlı Değil</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            KDV oranı ayarlarda tanımlanmamış. Lütfen bu ödeme için kullanılacak KDV oranını girin.
          </Alert>
          <TextField
            autoFocus
            fullWidth
            label="KDV Oranı (%)"
            type="number"
            value={vatRate || ''}
            onChange={(e) => setVatRate(e.target.value)}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialog(false)}>İptal</Button>
          <Button onClick={handleRateDialogSubmit} variant="contained">
            Devam Et
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentDialog;
