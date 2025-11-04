import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
} from '@mui/material';
import { Add, Edit, AccountBalance } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const CashRegisters = () => {
  const { institution } = useApp();
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    initialBalance: 0,
  });

  useEffect(() => {
    if (institution) {
      loadCashRegisters();
    }
  }, [institution]);

  const loadCashRegisters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cash-registers', {
        params: { institution: institution._id },
      });
      setCashRegisters(response.data);
    } catch (error) {
      console.error('Error loading cash registers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (register = null) => {
    if (register) {
      setSelectedRegister(register);
      setFormData({
        name: register.name || '',
        description: register.description || '',
        initialBalance: register.initialBalance || 0,
      });
    } else {
      setSelectedRegister(null);
      setFormData({
        name: '',
        description: '',
        initialBalance: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRegister(null);
    setError('');
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
      const registerData = {
        ...formData,
        institution: institution._id,
        initialBalance: parseFloat(formData.initialBalance),
      };

      if (selectedRegister) {
        await api.put(`/cash-registers/${selectedRegister._id}`, registerData);
      } else {
        await api.post('/cash-registers', registerData);
      }

      await loadCashRegisters();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Kasalar yükleniyor..." />;
  }

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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Kasa Yönetimi</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Yeni Kasa
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {cashRegisters.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Henüz kasa eklenmedi</Typography>
            </Paper>
          </Grid>
        ) : (
          cashRegisters.map((register) => (
            <Grid item xs={12} sm={6} md={4} key={register._id}>
              <Card elevation={3}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalance color="primary" />
                      <Typography variant="h6">{register.name}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(register)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                  </Box>

                  {register.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {register.description}
                    </Typography>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Mevcut Bakiye
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      ₺{(register.balance || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Başlangıç Bakiyesi
                    </Typography>
                    <Typography variant="body1">
                      ₺{(register.initialBalance || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{selectedRegister ? 'Kasa Düzenle' : 'Yeni Kasa'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kasa Adı"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
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
                  rows={2}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Başlangıç Bakiyesi (₺)"
                  name="initialBalance"
                  type="number"
                  value={formData.initialBalance}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CashRegisters;
