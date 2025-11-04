import React, { useState } from 'react';
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
  Grid,
  InputAdornment,
  Alert,
} from '@mui/material';
import api from '../../api';

const PaymentForm = ({ open, onClose, onSuccess, studentId, paymentPlanId }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'cash',
    cashRegister: '',
    description: '',
    receiptNumber: '',
  });
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open) {
      loadCashRegisters();
    }
  }, [open]);

  const loadCashRegisters = async () => {
    try {
      const response = await api.get('/cash-registers');
      setCashRegisters(response.data);
      if (response.data.length > 0) {
        setFormData((prev) => ({ ...prev, cashRegister: response.data[0]._id }));
      }
    } catch (error) {
      console.error('Error loading cash registers:', error);
    }
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
      const paymentData = {
        ...formData,
        student: studentId,
        paymentPlan: paymentPlanId,
        amount: parseFloat(formData.amount),
      };

      await api.post('/payments', paymentData);
      onSuccess();
      onClose();
      setFormData({
        amount: '',
        paymentMethod: 'cash',
        cashRegister: cashRegisters[0]?._id || '',
        description: '',
        receiptNumber: '',
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Ödeme alınırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Ödeme Al</DialogTitle>
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
                label="Tutar"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Ödeme Yöntemi</InputLabel>
                <Select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  label="Ödeme Yöntemi"
                >
                  <MenuItem value="cash">Nakit</MenuItem>
                  <MenuItem value="creditCard">Kredi Kartı</MenuItem>
                  <MenuItem value="bankTransfer">Havale/EFT</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
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

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fiş/Dekont No"
                name="receiptNumber"
                value={formData.receiptNumber}
                onChange={handleChange}
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
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>İptal</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Ödeme Al'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaymentForm;
