import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  Avatar,
  IconButton,
  Divider,
} from '@mui/material';
import { CloudUpload, Delete, Business } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { formatPhoneNumber, unformatPhoneNumber } from '../utils/phoneFormatter';

const InstitutionSetup = () => {
  const { institution, loadInitialData, currentUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    taxOffice: '',
    website: '',
  });

  useEffect(() => {
    if (institution) {
      setFormData({
        name: institution.name || '',
        address: institution.address || '',
        phone: institution.phone || '',
        email: institution.email || '',
        taxNumber: institution.taxNumber || '',
        taxOffice: institution.taxOffice || '',
        website: institution.website || '',
      });
      // Set logo preview if exists
      if (institution.logo) {
        // Check if it's already a Base64 data URL
        if (institution.logo.startsWith('data:')) {
          setLogoPreview(institution.logo);
        } else {
          // Legacy file path format - construct URL
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          const baseUrl = apiUrl.replace('/api', '');
          setLogoPreview(`${baseUrl}/${institution.logo}`);
        }
      }
    }
  }, [institution]);

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir resim dosyası seçin');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Dosya boyutu 2MB\'dan küçük olmalıdır');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('logo', file);

      const response = await api.post(`/institutions/${institution._id}/upload-logo`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Response now contains Base64 data URL directly
      setLogoPreview(response.data.logo);
      setSuccess('Logo başarıyla yüklendi');
      await loadInitialData();
    } catch (error) {
      setError('Logo yüklenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Logoyu silmek istediğinizden emin misiniz?')) return;

    try {
      await api.put(`/institutions/${institution._id}`, {
        ...formData,
        logo: '',
        updatedBy: currentUser?.username,
      });
      setLogoPreview('');
      setSuccess('Logo silindi');
      await loadInitialData();
    } catch (error) {
      setError('Logo silinirken hata oluştu');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Format phone number
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const institutionData = {
        ...formData,
        phone: unformatPhoneNumber(formData.phone),
        createdBy: currentUser?.username,
        updatedBy: currentUser?.username,
      };

      if (institution) {
        await api.put(`/institutions/${institution._id}`, institutionData);
        setSuccess('Kurum bilgileri güncellendi');
      } else {
        await api.post('/institutions', institutionData);
        setSuccess('Kurum başarıyla oluşturuldu');
      }
      await loadInitialData();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Kurum Ayarları
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Kurum bilgilerinizi buradan güncelleyebilirsiniz
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
          <Grid container spacing={3}>
            {/* Logo Upload Section */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Kurum Logosu
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Bu logo sol menüde kurum adı yerine görünecektir
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                  {logoPreview ? (
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        src={logoPreview}
                        variant="rounded"
                        sx={{ width: 120, height: 120, border: '2px solid', borderColor: 'primary.main' }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={handleRemoveLogo}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          bgcolor: 'white',
                          boxShadow: 1,
                          '&:hover': { bgcolor: 'error.light', color: 'white' }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Avatar
                      variant="rounded"
                      sx={{ width: 120, height: 120, bgcolor: 'grey.300' }}
                    >
                      <Business sx={{ fontSize: 60, color: 'grey.500' }} />
                    </Avatar>
                  )}
                </Box>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !institution}
                  sx={{ mt: 2 }}
                >
                  {uploading ? 'Yükleniyor...' : 'Logo Yükle'}
                </Button>

                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                  PNG, JPG veya GIF - Maks. 2MB
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

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
                rows={3}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
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
                label="Vergi Numarası"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Vergi Dairesi"
                name="taxOffice"
                value={formData.taxOffice}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Website"
                name="website"
                value={formData.website}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default InstitutionSetup;
