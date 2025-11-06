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
  Tabs,
  Tab,
} from '@mui/material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Institutions from './Institutions';
import InstitutionSetup from './InstitutionSetup';
import SeasonManagement from './SeasonManagement';

const Settings = () => {
  const { institution } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    vatRate: 10,
    creditCardCommission: 2.5,
    defaultInstallments: 1,
    logo: '',
    invoiceHeader: '',
  });

  const [cardCommissions, setCardCommissions] = useState({
    single: 4,
    installment2: 5,
    installment3: 6,
    installment6: 8,
    installment9: 10,
    installment12: 12
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
          vatRate: response.data.vatRate || 10,
          creditCardCommission: response.data.creditCardCommission || 2.5,
          defaultInstallments: response.data.defaultInstallments || 1,
          logo: response.data.logo || '',
          invoiceHeader: response.data.invoiceHeader || '',
        });
        if (response.data.cardCommissions) {
          setCardCommissions(response.data.cardCommissions);
        }
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
        cardCommissions: cardCommissions,
      };

      await api.post('/settings', settingsData);
      setSuccess('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
    <Container maxWidth="lg">
      <Paper sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2 }}>
            <Tab label="Genel Ayarlar" />
            <Tab label="Kurum Yönetimi" />
            <Tab label="Kurum Ayarları" />
            <Tab label="Sezon Yönetimi" />
          </Tabs>
        </Box>

        {/* Tab 0: Genel Ayarlar (Mevcut Ayarlar) */}
        {tabValue === 0 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Genel Ayarlar
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
                    label="KDV Oranı (%)"
                    name="vatRate"
                    type="number"
                    value={formData.vatRate}
                    onChange={handleChange}
                    inputProps={{ min: 0, max: 100 }}
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

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Kredi Kartı Komisyon Oranları (%)
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Tek Çekim"
                    type="number"
                    value={cardCommissions.single}
                    onChange={(e) => setCardCommissions({
                      ...cardCommissions,
                      single: parseFloat(e.target.value)
                    })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="2 Taksit"
                    type="number"
                    value={cardCommissions.installment2}
                    onChange={(e) => setCardCommissions({
                      ...cardCommissions,
                      installment2: parseFloat(e.target.value)
                    })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="3 Taksit"
                    type="number"
                    value={cardCommissions.installment3}
                    onChange={(e) => setCardCommissions({
                      ...cardCommissions,
                      installment3: parseFloat(e.target.value)
                    })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="6 Taksit"
                    type="number"
                    value={cardCommissions.installment6}
                    onChange={(e) => setCardCommissions({
                      ...cardCommissions,
                      installment6: parseFloat(e.target.value)
                    })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="9 Taksit"
                    type="number"
                    value={cardCommissions.installment9}
                    onChange={(e) => setCardCommissions({
                      ...cardCommissions,
                      installment9: parseFloat(e.target.value)
                    })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="12 Taksit"
                    type="number"
                    value={cardCommissions.installment12}
                    onChange={(e) => setCardCommissions({
                      ...cardCommissions,
                      installment12: parseFloat(e.target.value)
                    })}
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
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
          </Box>
        )}

        {/* Tab 1: Kurum Yönetimi */}
        {tabValue === 1 && (
          <Box sx={{ p: 4 }}>
            <Institutions />
          </Box>
        )}

        {/* Tab 2: Kurum Ayarları */}
        {tabValue === 2 && (
          <Box sx={{ p: 4 }}>
            <InstitutionSetup />
          </Box>
        )}

        {/* Tab 3: Sezon Yönetimi */}
        {tabValue === 3 && (
          <Box sx={{ p: 4 }}>
            <SeasonManagement />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Settings;
