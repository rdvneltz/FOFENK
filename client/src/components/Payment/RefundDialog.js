import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Divider,
  Alert,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';

const RefundDialog = ({ open, onClose, payment, cashRegisters, onSubmit }) => {
  const [cashRegisterId, setCashRegisterId] = useState('');
  const [refundOption, setRefundOption] = useState('net'); // 'net' or 'full'
  const [error, setError] = useState('');

  useEffect(() => {
    if (cashRegisters.length > 0 && payment) {
      // Default to the original cash register if available
      setCashRegisterId(payment.cashRegister?._id || payment.cashRegister || cashRegisters[0]._id);
    }
  }, [cashRegisters, payment]);

  const handleSubmit = () => {
    if (!cashRegisterId) {
      setError('Lütfen bir kasa seçin');
      return;
    }

    const refundAmount = calculateRefundAmount();

    onSubmit({
      refundCashRegisterId: cashRegisterId,
      refundAmount: refundAmount,
      refundFullCommission: refundOption === 'full',
    });

    setError('');
  };

  const calculateRefundAmount = () => {
    if (!payment) return 0;

    const netAmount = payment.amount - (payment.creditCardCommission?.amount || 0);

    if (refundOption === 'net') {
      return netAmount;
    } else {
      return payment.amount; // Full amount including commission
    }
  };

  if (!payment) return null;

  const hasCommission = payment.creditCardCommission && payment.creditCardCommission.amount > 0;
  const hasVat = payment.isInvoiced && payment.vat && payment.vat.amount > 0;
  const netAmount = payment.amount - (payment.creditCardCommission?.amount || 0);
  const refundAmount = calculateRefundAmount();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Ödeme İadesi
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ödeme Bilgileri
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Öğrenci:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">
                {payment.student?.firstName} {payment.student?.lastName}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Ödeme Tutarı:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">
                ₺{payment.amount.toLocaleString('tr-TR')}
              </Typography>
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Ödeme Tipi:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                {payment.paymentType === 'creditCard' ? 'Kredi Kartı' : 'Nakit'}
              </Typography>
            </Grid>

            {hasCommission && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Banka Komisyonu:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="error.main">
                    ₺{payment.creditCardCommission.amount.toLocaleString('tr-TR')}
                  </Typography>
                </Grid>
              </>
            )}

            {hasVat && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    KDV:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="error.main">
                    ₺{payment.vat.amount.toLocaleString('tr-TR')}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {hasCommission && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                ⚠️ DİKKAT: Kredi Kartı İşlemi
              </Typography>
              <Typography variant="body2">
                Öğrenciden ₺{payment.amount.toLocaleString('tr-TR')} çekilmiştir ancak ₺{payment.creditCardCommission.amount.toLocaleString('tr-TR')} banka komisyonu ödenmiştir. Bu tutar bankadan geri alınamaz.
              </Typography>
            </Alert>

            <FormControl component="fieldset">
              <Typography variant="body2" gutterBottom fontWeight="bold">
                İade Seçeneği:
              </Typography>
              <RadioGroup
                value={refundOption}
                onChange={(e) => setRefundOption(e.target.value)}
              >
                <FormControlLabel
                  value="net"
                  control={<Radio />}
                  label={`₺${netAmount.toLocaleString('tr-TR')} iade et (net tutar - komisyon hariç)`}
                />
                <FormControlLabel
                  value="full"
                  control={<Radio />}
                  label={`₺${payment.amount.toLocaleString('tr-TR')} iade et (komisyon dahil)`}
                />
              </RadioGroup>
              <Typography variant="caption" color="text.secondary">
                * Her iki durumda da komisyon gideri kalacaktır (₺{payment.creditCardCommission.amount.toLocaleString('tr-TR')})
              </Typography>
            </FormControl>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth required>
            <InputLabel>Hangi Kasadan İade Edilecek?</InputLabel>
            <Select
              value={cashRegisterId}
              onChange={(e) => setCashRegisterId(e.target.value)}
              label="Hangi Kasadan İade Edilecek?"
            >
              {cashRegisters.map((register) => (
                <MenuItem key={register._id} value={register._id}>
                  {register.name} (Bakiye: ₺{(register.balance || 0).toLocaleString('tr-TR')})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {hasVat && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                📄 Vergi İadesi
              </Typography>
              <Typography variant="body2">
                Faturalı ödemeydi, ₺{payment.vat.amount.toLocaleString('tr-TR')} KDV iadesi kasaya geri gelecektir.
              </Typography>
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            İade Özeti
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2">Müşteriye İade:</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold" color="error.main">
                -₺{refundAmount.toLocaleString('tr-TR')}
              </Typography>
            </Grid>

            {hasVat && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2">Vergi İadesi (Kasaya Girer):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    +₺{payment.vat.amount.toLocaleString('tr-TR')}
                  </Typography>
                </Grid>
              </>
            )}

            {hasCommission && (
              <>
                <Grid item xs={6}>
                  <Typography variant="body2">Komisyon Gideri (Kalır):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    -₺{payment.creditCardCommission.amount.toLocaleString('tr-TR')}
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSubmit} variant="contained" color="error">
          İadeyi Onayla
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RefundDialog;
