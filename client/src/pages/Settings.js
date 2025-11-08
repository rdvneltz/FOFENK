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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Institutions from './Institutions';
import InstitutionSetup from './InstitutionSetup';
import SeasonManagement from './SeasonManagement';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { institution, user } = useApp();
  const navigate = useNavigate();
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

  const [resetDialog, setResetDialog] = useState({
    open: false,
    step: 1, // 1: confirmation, 2: password entry
    username: '',
    password: '',
    error: '',
    processing: false
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

  const handleResetDatabase = async () => {
    if (resetDialog.step === 1) {
      // Move to password entry
      setResetDialog({ ...resetDialog, step: 2 });
      return;
    }

    // Step 2: Verify and reset
    if (!resetDialog.username || !resetDialog.password) {
      setResetDialog({ ...resetDialog, error: 'Kullanıcı adı ve şifre gerekli' });
      return;
    }

    try {
      setResetDialog({ ...resetDialog, processing: true, error: '' });

      await api.post('/settings/reset-database', {
        username: resetDialog.username,
        password: resetDialog.password
      });

      // Success - close dialog and show success message
      setResetDialog({
        open: false,
        step: 1,
        username: '',
        password: '',
        error: '',
        processing: false
      });

      alert('✅ Veritabanı başarıyla sıfırlandı! Lütfen yeniden giriş yapın.');

      // Redirect to login
      localStorage.removeItem('token');
      navigate('/login');

    } catch (error) {
      setResetDialog({
        ...resetDialog,
        processing: false,
        error: error.response?.data?.message || 'Bir hata oluştu'
      });
    }
  };

  const handleCloseResetDialog = () => {
    setResetDialog({
      open: false,
      step: 1,
      username: '',
      password: '',
      error: '',
      processing: false
    });
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

            <Divider sx={{ my: 6 }} />

            {/* Danger Zone - Database Reset */}
            {user?.role === 'superadmin' && (
              <Box sx={{ p: 3, border: '2px solid', borderColor: 'error.main', borderRadius: 2, bgcolor: 'error.lighter' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningIcon color="error" />
                  <Typography variant="h6" color="error">
                    Tehlikeli Bölge
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Bu bölümdeki işlemler geri alınamaz. Dikkatli olun!
                </Typography>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Veritabanını Sıfırla
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Sistemdeki tüm verileri siler (öğrenciler, dersler, ödemeler, giderler, vb.).
                    Sadece süperadmin kullanıcıları korunur. Bu işlem test amaçlıdır ve geri alınamaz!
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setResetDialog({ ...resetDialog, open: true })}
                    startIcon={<WarningIcon />}
                  >
                    Veritabanını Sıfırla
                  </Button>
                </Box>
              </Box>
            )}
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

      {/* Database Reset Dialog */}
      <Dialog
        open={resetDialog.open}
        onClose={handleCloseResetDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            <span>Veritabanını Sıfırla</span>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {resetDialog.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetDialog.error}
            </Alert>
          )}

          {resetDialog.step === 1 ? (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                <strong>⚠️ UYARI: Bu işlem geri alınamaz!</strong>
              </DialogContentText>
              <DialogContentText sx={{ mb: 2 }}>
                Aşağıdaki veriler <strong>kalıcı olarak silinecek</strong>:
              </DialogContentText>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                <li>Tüm öğrenciler</li>
                <li>Tüm dersler ve kayıtlar</li>
                <li>Tüm ödeme planları ve ödemeler</li>
                <li>Tüm giderler</li>
                <li>Tüm kasalar</li>
                <li>Tüm eğitmenler</li>
                <li>Tüm kurumlar ve sezonlar</li>
                <li>Tüm ayarlar</li>
                <li>Tüm kullanıcılar (süperadmin hariç)</li>
              </Box>
              <Alert severity="info">
                Sadece <strong>süperadmin kullanıcıları</strong> korunacak. Diğer her şey silinecek.
              </Alert>
            </>
          ) : (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Devam etmek için <strong>süperadmin</strong> kullanıcı adı ve şifrenizi girin:
              </DialogContentText>
              <TextField
                autoFocus
                fullWidth
                label="Kullanıcı Adı"
                value={resetDialog.username}
                onChange={(e) => setResetDialog({ ...resetDialog, username: e.target.value })}
                sx={{ mb: 2 }}
                disabled={resetDialog.processing}
              />
              <TextField
                fullWidth
                label="Şifre"
                type="password"
                value={resetDialog.password}
                onChange={(e) => setResetDialog({ ...resetDialog, password: e.target.value })}
                disabled={resetDialog.processing}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog} disabled={resetDialog.processing}>
            İptal
          </Button>
          <Button
            onClick={handleResetDatabase}
            variant="contained"
            color="error"
            disabled={resetDialog.processing}
            startIcon={resetDialog.step === 1 ? <WarningIcon /> : null}
          >
            {resetDialog.processing
              ? 'Siliniyor...'
              : resetDialog.step === 1
              ? 'Devam Et'
              : 'VERİTABANINI SİFIRLA'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
