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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Add, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const TrialLessons = () => {
  const { institution, season } = useApp();
  const [trials, setTrials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    studentName: '',
    phone: '',
    email: '',
    course: '',
    date: '',
    time: '',
    notes: '',
  });

  useEffect(() => {
    if (institution && season) {
      loadData();
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trialsRes, coursesRes] = await Promise.all([
        api.get('/trial-lessons', {
          params: {
            institution: institution._id,
            season: season._id,
          },
        }),
        api.get('/courses', {
          params: {
            institution: institution._id,
            season: season._id,
          },
        }),
      ]);
      setTrials(trialsRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      studentName: '',
      phone: '',
      email: '',
      course: '',
      date: '',
      time: '',
      notes: '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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
      const trialData = {
        ...formData,
        institution: institution._id,
        season: season._id,
      };

      await api.post('/trial-lessons', trialData);
      await loadData();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/trial-lessons/${id}`, { status });
      await loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Durum güncellenemedi');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Deneme dersleri yükleniyor..." />;
  }

  if (!institution || !season) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum ve sezon seçin
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Deneme Dersleri</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
          Yeni Deneme Dersi
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
              <TableCell>Öğrenci Adı</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Ders</TableCell>
              <TableCell>Tarih & Saat</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">Henüz deneme dersi kaydı yok</Typography>
                </TableCell>
              </TableRow>
            ) : (
              trials.map((trial) => (
                <TableRow key={trial._id}>
                  <TableCell>
                    <Typography variant="body1">{trial.studentName}</Typography>
                    {trial.email && (
                      <Typography variant="caption" color="text.secondary">
                        {trial.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{trial.phone}</TableCell>
                  <TableCell>{trial.course?.name || '-'}</TableCell>
                  <TableCell>
                    {trial.date && new Date(trial.date).toLocaleDateString('tr-TR')}
                    {trial.time && ` - ${trial.time}`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        trial.status === 'pending'
                          ? 'Bekliyor'
                          : trial.status === 'completed'
                          ? 'Tamamlandı'
                          : 'İptal'
                      }
                      color={
                        trial.status === 'completed'
                          ? 'success'
                          : trial.status === 'cancelled'
                          ? 'error'
                          : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {trial.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateStatus(trial._id, 'completed')}
                          color="success"
                          title="Tamamlandı olarak işaretle"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateStatus(trial._id, 'cancelled')}
                          color="error"
                          title="İptal et"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Yeni Deneme Dersi</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Öğrenci Adı Soyadı"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
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
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Ders</InputLabel>
                  <Select
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    label="Ders"
                  >
                    {courses.map((course) => (
                      <MenuItem key={course._id} value={course._id}>
                        {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tarih"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Saat"
                  name="time"
                  type="time"
                  value={formData.time}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
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
    </Box>
  );
};

export default TrialLessons;
