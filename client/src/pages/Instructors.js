import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Alert,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, Phone, Email, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { formatPhoneNumber, unformatPhoneNumber } from '../utils/phoneFormatter';

const Instructors = () => {
  const navigate = useNavigate();
  const { institution, season } = useApp();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    tcNo: '',
    address: '',
    paymentType: 'monthly',
    paymentAmount: '',
    notes: '',
  });

  useEffect(() => {
    if (institution && season) {
      loadInstructors();
    }
  }, [institution, season]);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/instructors', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        },
      });
      setInstructors(response.data);
    } catch (error) {
      console.error('Error loading instructors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (instructor = null) => {
    if (instructor) {
      setSelectedInstructor(instructor);
      setFormData({
        firstName: instructor.firstName || '',
        lastName: instructor.lastName || '',
        phone: instructor.phone || '',
        email: instructor.email || '',
        tcNo: instructor.tcNo || '',
        address: instructor.address || '',
        paymentType: instructor.paymentType || 'monthly',
        paymentAmount: instructor.paymentAmount || '',
        notes: instructor.notes || '',
      });
    } else {
      setSelectedInstructor(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        tcNo: '',
        address: '',
        paymentType: 'monthly',
        paymentAmount: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInstructor(null);
    setError('');
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
    setLoading(true);

    try {
      const instructorData = {
        ...formData,
        phone: unformatPhoneNumber(formData.phone),
        institution: institution._id,
        season: season._id,
      };

      if (selectedInstructor) {
        await api.put(`/instructors/${selectedInstructor._id}`, instructorData);
      } else {
        await api.post('/instructors', instructorData);
      }

      await loadInstructors();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/instructors/${selectedInstructor._id}`);
      await loadInstructors();
      setOpenConfirm(false);
      setSelectedInstructor(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Eğitmenler yükleniyor..." />;
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
        <Typography variant="h4">Eğitmenler</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Yeni Eğitmen
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
              <TableCell>Eğitmen</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Ödeme Tipi</TableCell>
              <TableCell>Ödeme Tutarı</TableCell>
              <TableCell>Bakiye</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {instructors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">Henüz eğitmen eklenmedi</Typography>
                </TableCell>
              </TableRow>
            ) : (
              instructors.map((instructor) => (
                <TableRow key={instructor._id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>{instructor.firstName?.charAt(0) || 'E'}</Avatar>
                      <Typography>{instructor.firstName} {instructor.lastName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{instructor.phone || '-'}</TableCell>
                  <TableCell>{instructor.email || '-'}</TableCell>
                  <TableCell>
                    {instructor.paymentType === 'monthly' ? 'Aylık' :
                     instructor.paymentType === 'perLesson' ? 'Ders Başı' :
                     instructor.paymentType === 'hourly' ? 'Saatlik' :
                     instructor.paymentType === 'perStudent' ? 'Öğrenci Başı' : '-'}
                  </TableCell>
                  <TableCell>
                    {instructor.paymentAmount ? `₺${instructor.paymentAmount}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={instructor.balance > 0 ? 'error.main' : 'success.main'}
                    >
                      {instructor.balance > 0 ? '+' : ''}
                      ₺{Math.abs(instructor.balance || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/instructors/${instructor._id}`)}
                      color="info"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(instructor)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedInstructor(instructor);
                        setOpenConfirm(true);
                      }}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedInstructor ? 'Eğitmen Düzenle' : 'Yeni Eğitmen'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ad"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Soyad"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="TC Kimlik No"
                  name="tcNo"
                  value={formData.tcNo}
                  onChange={handleChange}
                  inputProps={{ maxLength: 11 }}
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-posta"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
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
                <FormControl fullWidth required>
                  <InputLabel>Ödeme Tipi</InputLabel>
                  <Select
                    name="paymentType"
                    value={formData.paymentType}
                    onChange={handleChange}
                    label="Ödeme Tipi"
                  >
                    <MenuItem value="monthly">Aylık Maaş</MenuItem>
                    <MenuItem value="perLesson">Ders Başı</MenuItem>
                    <MenuItem value="hourly">Saat Başı</MenuItem>
                    <MenuItem value="perStudent">Öğrenci Başı</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ödeme Tutarı (₺)"
                  name="paymentAmount"
                  type="number"
                  value={formData.paymentAmount}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notlar"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  multiline
                  rows={3}
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

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleDelete}
        title="Eğitmen Sil"
        message="Bu eğitmeni silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
      />
    </Box>
  );
};

export default Instructors;
