import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  Box,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { formatPhoneNumber, unformatPhoneNumber } from '../utils/phoneFormatter';

const Institutions = () => {
  const { institutions, loadInitialData, currentUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    taxNumber: '',
    taxOffice: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      taxNumber: '',
      taxOffice: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (institution) => {
    setEditingId(institution._id);
    setFormData({
      name: institution.name || '',
      address: institution.address || '',
      phone: institution.phone || '',
      email: institution.email || '',
      website: institution.website || '',
      taxNumber: institution.taxNumber || '',
      taxOffice: institution.taxOffice || '',
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const institutionData = {
        ...formData,
        phone: unformatPhoneNumber(formData.phone),
        updatedBy: currentUser?.username,
      };

      if (editingId) {
        await api.put(`/institutions/${editingId}`, institutionData);
      } else {
        await api.post('/institutions', {
          ...institutionData,
          createdBy: currentUser?.username,
        });
      }

      await loadInitialData(currentUser);
      handleClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kurumu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/institutions/${id}`);
      await loadInitialData(currentUser);
    } catch (error) {
      setError(error.response?.data?.message || 'Kurum silinemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading && institutions.length === 0) {
    return <LoadingSpinner message="Kurumlar yükleniyor..." />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Kurum Yönetimi</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Yeni Kurum
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Kurum Adı</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Vergi No</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {institutions.map((institution) => (
              <TableRow key={institution._id}>
                <TableCell>{institution.name}</TableCell>
                <TableCell>{institution.phone}</TableCell>
                <TableCell>{institution.email}</TableCell>
                <TableCell>{institution.taxNumber}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(institution)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(institution._id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {institutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Henüz kurum bulunmuyor
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Kurum Düzenle' : 'Yeni Kurum'}
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
                label="Kurum Adı"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                name="address"
                value={formData.address}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0 (5xx) xxx xx xx"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="E-posta"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Web Sitesi"
                name="website"
                value={formData.website}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vergi Numarası"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vergi Dairesi"
                name="taxOffice"
                value={formData.taxOffice}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>İptal</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name}
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Institutions;
