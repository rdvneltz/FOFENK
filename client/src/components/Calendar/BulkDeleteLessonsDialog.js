import React, { useState, useEffect } from 'react';
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
  Alert,
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { Delete, Warning } from '@mui/icons-material';
import api from '../../api';
import { useApp } from '../../context/AppContext';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
  { value: 0, label: 'Pazar' }
];

const BulkDeleteLessonsDialog = ({ open, onClose, onSuccess }) => {
  const { institution, season, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    startDate: new Date(),
    endDate: null,
    daysOfWeek: [],
    onlyFuture: true,
    onlyScheduled: true
  });
  const [error, setError] = useState('');
  const [matchingLessons, setMatchingLessons] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open && institution && season) {
      fetchCourses();
      fetchInstructors();
    }
  }, [open, institution, season]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses', {
        params: {
          institution: institution._id,
          season: season._id
        }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await api.get('/instructors', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      setInstructors(response.data);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setShowPreview(false);
  };

  const handleDayToggle = (dayValue) => {
    setFormData(prev => {
      const newDays = prev.daysOfWeek.includes(dayValue)
        ? prev.daysOfWeek.filter(d => d !== dayValue)
        : [...prev.daysOfWeek, dayValue];
      return { ...prev, daysOfWeek: newDays };
    });
    setShowPreview(false);
  };

  const handlePreview = async () => {
    if (!formData.startDate) {
      setError('Başlangıç tarihi seçin');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = {
        institution: institution._id,
        season: season._id,
        startDate: formData.startDate.toISOString(),
      };

      if (formData.endDate) {
        params.endDate = formData.endDate.toISOString();
      }

      if (formData.courseId) {
        params.courseId = formData.courseId;
      }

      if (formData.instructorId) {
        params.instructorId = formData.instructorId;
      }

      // Get lessons
      const response = await api.get('/scheduled-lessons', { params });
      let lessons = response.data;

      // Filter by days of week if specified
      if (formData.daysOfWeek.length > 0) {
        lessons = lessons.filter(lesson => {
          const dayOfWeek = new Date(lesson.date).getDay();
          return formData.daysOfWeek.includes(dayOfWeek);
        });
      }

      // Filter by status if onlyScheduled
      if (formData.onlyScheduled) {
        lessons = lessons.filter(lesson => lesson.status === 'scheduled');
      }

      // Filter future only if onlyFuture
      if (formData.onlyFuture) {
        const now = new Date();
        lessons = lessons.filter(lesson => new Date(lesson.date) >= now);
      }

      setMatchingLessons(lessons);
      setShowPreview(true);

    } catch (error) {
      console.error('Error previewing lessons:', error);
      setError('Dersler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (matchingLessons.length === 0) {
      setError('Silinecek ders bulunamadı');
      return;
    }

    const confirmMessage = `${matchingLessons.length} adet dersi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);

      // Delete each lesson
      const deletePromises = matchingLessons.map(lesson =>
        api.delete(`/scheduled-lessons/${lesson._id}`, {
          data: { deletedBy: user?.username }
        })
      );

      await Promise.all(deletePromises);

      alert(`${matchingLessons.length} adet ders başarıyla silindi!`);
      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error deleting lessons:', error);
      setError('Dersler silinirken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      courseId: '',
      instructorId: '',
      startDate: new Date(),
      endDate: null,
      daysOfWeek: [],
      onlyFuture: true,
      onlyScheduled: true
    });
    setError('');
    setMatchingLessons([]);
    setShowPreview(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Delete />
          Toplu Ders Silme
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Bu araç ile seçtiğiniz kriterlere uyan dersleri toplu olarak silebilirsiniz.
            Önce "Önizleme" butonuna tıklayarak hangi derslerin silineceğini kontrol edin.
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          {/* Course Filter */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Ders (Opsiyonel)</InputLabel>
              <Select
                value={formData.courseId}
                onChange={(e) => handleChange('courseId', e.target.value)}
                label="Ders (Opsiyonel)"
              >
                <MenuItem value="">Tümü</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course._id} value={course._id}>
                    {course.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Instructor Filter */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Eğitmen (Opsiyonel)</InputLabel>
              <Select
                value={formData.instructorId}
                onChange={(e) => handleChange('instructorId', e.target.value)}
                label="Eğitmen (Opsiyonel)"
              >
                <MenuItem value="">Tümü</MenuItem>
                {instructors.map((instructor) => (
                  <MenuItem key={instructor._id} value={instructor._id}>
                    {instructor.firstName} {instructor.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <DatePicker
                label="Başlangıç Tarihi"
                value={formData.startDate}
                onChange={(date) => handleChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <DatePicker
                label="Bitiş Tarihi (Opsiyonel)"
                value={formData.endDate}
                onChange={(date) => handleChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>

          {/* Days of Week */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Günler (Opsiyonel - Seçilmezse tüm günler)
            </Typography>
            <FormGroup row>
              {DAYS_OF_WEEK.map((day) => (
                <FormControlLabel
                  key={day.value}
                  control={
                    <Checkbox
                      checked={formData.daysOfWeek.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                    />
                  }
                  label={day.label}
                />
              ))}
            </FormGroup>
          </Grid>

          {/* Options */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.onlyFuture}
                  onChange={(e) => handleChange('onlyFuture', e.target.checked)}
                />
              }
              label="Sadece gelecekteki dersler"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.onlyScheduled}
                  onChange={(e) => handleChange('onlyScheduled', e.target.checked)}
                />
              }
              label='Sadece "Planlandı" durumundaki dersler (tamamlanmış ve iptal edilmiş hariç)'
            />
          </Grid>

          {/* Preview Results */}
          {showPreview && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Alert severity={matchingLessons.length > 0 ? 'warning' : 'info'} icon={<Warning />}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>{matchingLessons.length} adet ders</strong> bulundu
                </Typography>
              </Alert>

              {matchingLessons.length > 0 && (
                <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                  <List dense>
                    {matchingLessons.slice(0, 50).map((lesson, index) => (
                      <ListItem key={lesson._id} divider>
                        <ListItemText
                          primary={`${lesson.course?.name || 'Ders'} - ${lesson.instructor ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}` : 'Eğitmen yok'}`}
                          secondary={`${new Date(lesson.date).toLocaleDateString('tr-TR')} - ${lesson.startTime}-${lesson.endTime} - ${lesson.status}`}
                        />
                      </ListItem>
                    ))}
                    {matchingLessons.length > 50 && (
                      <ListItem>
                        <ListItemText
                          secondary={`... ve ${matchingLessons.length - 50} ders daha`}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handlePreview}
          variant="outlined"
          disabled={loading}
        >
          {loading ? 'Yükleniyor...' : 'Önizleme'}
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={loading || !showPreview || matchingLessons.length === 0}
          startIcon={<Delete />}
        >
          {matchingLessons.length} Dersi Sil
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkDeleteLessonsDialog;
