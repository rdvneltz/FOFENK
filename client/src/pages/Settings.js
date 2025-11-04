import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  Divider,
  InputAdornment,
} from '@mui/material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Settings = () => {
  const { institution } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    vatRate: 18,
    creditCardCommission: 2.5,
    defaultInstallments: 1,
    logo: '',
    invoiceHeader: '',
  });

  useEffect(() => {
    if (institution) {
      loadSettings();
    }
  }, [institution]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/settings/${institution._id}`);
      if (response.data) {
        setFormData({
          vatRate: response.data.vatRate || 18,
          creditCardCommission: response.data.creditCardCommission || 2.5,
          defaultInstallments: response.data.defaultInstallments || 1,
          logo: response.data.logo || '',
          invoiceHeader: response.data.invoiceHeader || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
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
      const settingsData = {
        ...formData,
        institution: institution._id,
        vatRate: parseFloat(formData.vatRate),
        creditCardCommission: parseFloat(formData.creditCardCommission),
        defaultInstallments: parseInt(formData.defaultInstallments),
      };

      await api.post('/settings', settingsData);
      setSuccess('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

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
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Sistem Ayarları
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Finansal Ayarlar
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="KDV Oranı"
                name="vatRate"
                type="number"
                value={formData.vatRate}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Kredi Kartı Komisyon Oranı"
                name="creditCardCommission"
                type="number"
                value={formData.creditCardCommission}
                onChange={handleChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Varsayılan Taksit Sayısı"
                name="defaultInstallments"
                type="number"
                value={formData.defaultInstallments}
                onChange={handleChange}
                inputProps={{ min: 1, max: 12 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 2 }}>
            Görsel Ayarlar
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Logo URL"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                helperText="Kurum logonuzun URL adresi"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fatura Başlığı"
                name="invoiceHeader"
                value={formData.invoiceHeader}
                onChange={handleChange}
                multiline
                rows={4}
                helperText="Fatura ve dekontlarda görünecek başlık metni"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default Settings;
