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
import { Add, Edit, Delete, Group, PersonAdd, Warning } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SetupRequired from '../components/Common/SetupRequired';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import BulkEnrollDialog from '../components/Courses/BulkEnrollDialog';

const Courses = () => {
  const { institution, season, currentUser } = useApp();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openBulkEnroll, setOpenBulkEnroll] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [noInstructorDialog, setNoInstructorDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructor: '',
    capacity: '',
    pricingType: 'monthly',
    pricePerLesson: '',
    pricePerMonth: '',
    weeklyFrequency: 1,
    isFree: false,
    duration: '',
    schedule: '',
  });

  useEffect(() => {
    if (institution && season) {
      loadData();
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, instructorsRes] = await Promise.all([
        api.get('/courses', {
          params: {
            institution: institution._id,
            season: season._id,
          },
        }),
        api.get('/instructors', {
          params: {
            institutionId: institution._id,
            seasonId: season._id
          },
        }),
      ]);
      setCourses(coursesRes.data);
      setInstructors(instructorsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (course = null) => {
    // Check if instructors exist (only for new course)
    if (!course && instructors.length === 0) {
      setNoInstructorDialog(true);
      return;
    }

    if (course) {
      setSelectedCourse(course);
      setFormData({
        name: course.name || '',
        description: course.description || '',
        instructor: course.instructor?._id || '',
        capacity: course.capacity || '',
        pricingType: course.pricingType || 'monthly',
        pricePerLesson: course.pricePerLesson || '',
        pricePerMonth: course.pricePerMonth || '',
        weeklyFrequency: course.weeklyFrequency || 1,
        isFree: course.isFree || false,
        duration: course.duration || '',
        schedule: course.schedule || '',
      });
    } else {
      setSelectedCourse(null);
      setFormData({
        name: '',
        description: '',
        instructor: '',
        capacity: '',
        pricingType: 'monthly',
        pricePerLesson: '',
        pricePerMonth: '',
        weeklyFrequency: 1,
        isFree: false,
        duration: '',
        schedule: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCourse(null);
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
      const courseData = {
        ...formData,
        institution: institution._id,
        season: season._id,
        createdBy: currentUser?.username,
        updatedBy: currentUser?.username,
      };

      if (selectedCourse) {
        await api.put(`/courses/${selectedCourse._id}`, courseData);
      } else {
        await api.post('/courses', courseData);
      }

      await loadData();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/courses/${selectedCourse._id}`);
      await loadData();
      setOpenConfirm(false);
      setSelectedCourse(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  const handleBulkEnrollSuccess = (data) => {
    setSuccessMessage(data.message);
    setTimeout(() => setSuccessMessage(''), 3000);
    loadData();
  };

  const handleOpenBulkEnroll = (course) => {
    setSelectedCourse(course);
    setOpenBulkEnroll(true);
  };

  if (loading) {
    return <LoadingSpinner message="Dersler yükleniyor..." />;
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
        <Typography variant="h4">Dersler</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Yeni Ders
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ders Adı</TableCell>
              <TableCell>Eğitmen</TableCell>
              <TableCell>Kapasite</TableCell>
              <TableCell>Ücret</TableCell>
              <TableCell>Süre</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">Henüz ders eklenmedi</Typography>
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course._id}>
                  <TableCell>
                    <Typography variant="body1">{course.name}</Typography>
                    {course.description && (
                      <Typography variant="caption" color="text.secondary">
                        {course.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{course.instructor?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<Group />}
                      label={`${course.enrollmentCount || 0}/${course.capacity || 0}`}
                      size="small"
                      color={
                        (course.enrollmentCount || 0) >= (course.capacity || 0)
                          ? 'error'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {course.isFree ? (
                      <Chip label="Ücretsiz" color="success" size="small" />
                    ) : (
                      <>
                        ₺{(course.pricingType === 'monthly'
                          ? course.pricePerMonth
                          : course.pricePerLesson
                        )?.toLocaleString('tr-TR') || 0}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          /{course.pricingType === 'monthly' ? 'ay' : 'ders'}
                        </Typography>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{course.duration || '-'} dk</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenBulkEnroll(course)}
                      color="success"
                      title="Öğrenci Ekle"
                    >
                      <PersonAdd />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(course)}
                      color="primary"
                      title="Düzenle"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedCourse(course);
                        setOpenConfirm(true);
                      }}
                      color="error"
                      title="Sil"
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

      {/* Course Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{selectedCourse ? 'Ders Düzenle' : 'Yeni Ders'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ders Adı"
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Eğitmen</InputLabel>
                  <Select
                    name="instructor"
                    value={formData.instructor}
                    onChange={handleChange}
                    label="Eğitmen"
                  >
                    <MenuItem value="">Seçiniz</MenuItem>
                    {instructors.map((instructor) => (
                      <MenuItem key={instructor._id} value={instructor._id}>
                        {instructor.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Kapasite"
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Ücretlendirme Tipi</InputLabel>
                  <Select
                    name="pricingType"
                    value={formData.pricingType}
                    onChange={handleChange}
                    label="Ücretlendirme Tipi"
                  >
                    <MenuItem value="monthly">Aylık</MenuItem>
                    <MenuItem value="perLesson">Ders Başı</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {formData.pricingType === 'perLesson' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ders Başı Ücret (₺)"
                    name="pricePerLesson"
                    type="number"
                    value={formData.pricePerLesson}
                    onChange={handleChange}
                  />
                </Grid>
              )}
              {formData.pricingType === 'monthly' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Aylık Ücret (₺)"
                      name="pricePerMonth"
                      type="number"
                      value={formData.pricePerMonth}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Haftada Kaç Gün?"
                      name="weeklyFrequency"
                      type="number"
                      value={formData.weeklyFrequency}
                      onChange={handleChange}
                      inputProps={{ min: 1, max: 7 }}
                      helperText={formData.pricePerMonth && formData.weeklyFrequency
                        ? `Ders Başı: ₺${(formData.pricePerMonth / (4 * formData.weeklyFrequency)).toFixed(2)}`
                        : 'Aylık ücret ÷ (4 hafta × gün sayısı)'}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Süre (dakika)"
                  name="duration"
                  type="number"
                  value={formData.duration}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Program (örn: Pazartesi 10:00)"
                  name="schedule"
                  value={formData.schedule}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleDelete}
        title="Ders Sil"
        message="Bu dersi silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
      />

      {/* Bulk Enroll Dialog */}
      <BulkEnrollDialog
        open={openBulkEnroll}
        onClose={() => {
          setOpenBulkEnroll(false);
          setSelectedCourse(null);
        }}
        course={selectedCourse}
        onSuccess={handleBulkEnrollSuccess}
      />

      {/* No Instructor Dialog */}
      <Dialog open={noInstructorDialog} onClose={() => setNoInstructorDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'warning.light', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning />
          Eğitmen Gerekli
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" paragraph>
            Ders oluşturmadan önce en az bir eğitmen kaydı oluşturmanız gerekmektedir.
          </Typography>
          <Alert severity="info">
            Lütfen önce "Eğitmenler" sayfasından bir eğitmen ekleyin.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoInstructorDialog(false)}>
            İptal
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setNoInstructorDialog(false);
              navigate('/instructors');
            }}
          >
            Eğitmen Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Courses;
