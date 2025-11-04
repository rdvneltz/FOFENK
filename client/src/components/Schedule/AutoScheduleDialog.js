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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Box,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
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

const FREQUENCIES = [
  { value: 'weekly', label: 'Haftalık' },
  { value: 'biweekly', label: 'İki Haftada Bir' },
  { value: 'monthly', label: 'Aylık' }
];

const AutoScheduleDialog = ({ open, onClose, onSuccess }) => {
  const { institution, season } = useApp();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    startDate: null,
    endDate: null,
    daysOfWeek: [],
    startTime: '10:00',
    endTime: '12:00',
    frequency: 'weekly',
    skipHolidays: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && institution && season) {
      fetchCourses();
      fetchInstructors();
    }
  }, [open, institution, season]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await axios.get('/api/instructors', {
        params: {
          institutionId: institution._id
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
  };

  const handleDayToggle = (dayValue) => {
    setFormData(prev => {
      const newDays = prev.daysOfWeek.includes(dayValue)
        ? prev.daysOfWeek.filter(d => d !== dayValue)
        : [...prev.daysOfWeek, dayValue];
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const validateForm = () => {
    if (!formData.courseId) {
      setError('Lütfen bir ders seçin');
      return false;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Başlangıç ve bitiş tarihlerini seçin');
      return false;
    }
    if (formData.startDate >= formData.endDate) {
      setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      return false;
    }
    if (formData.daysOfWeek.length === 0) {
      setError('En az bir gün seçin');
      return false;
    }
    if (!formData.startTime || !formData.endTime) {
      setError('Başlangıç ve bitiş saatlerini girin');
      return false;
    }
    if (formData.startTime >= formData.endTime) {
      setError('Bitiş saati başlangıç saatinden sonra olmalıdır');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await axios.post('/api/scheduled-lessons/generate-schedule', {
        courseId: formData.courseId,
        instructorId: formData.instructorId || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        frequency: formData.frequency,
        seasonId: season._id,
        institutionId: institution._id,
        skipHolidays: formData.skipHolidays,
        createdBy: 'user' // TODO: Get from auth context
      });

      if (response.data.success) {
        onSuccess(response.data);
        handleClose();
      } else {
        setError(response.data.message || 'Program oluşturulurken hata oluştu');
      }
    } catch (error) {
      console.error('Error generating schedule:', error);
      setError(error.response?.data?.message || 'Program oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      courseId: '',
      instructorId: '',
      startDate: null,
      endDate: null,
      daysOfWeek: [],
      startTime: '10:00',
      endTime: '12:00',
      frequency: 'weekly',
      skipHolidays: true
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Otomatik Program Oluştur</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Course Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Ders</InputLabel>
              <Select
                value={formData.courseId}
                onChange={(e) => handleChange('courseId', e.target.value)}
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

          {/* Instructor Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Eğitmen (Opsiyonel)</InputLabel>
              <Select
                value={formData.instructorId}
                onChange={(e) => handleChange('instructorId', e.target.value)}
                label="Eğitmen (Opsiyonel)"
              >
                <MenuItem value="">Seçilmedi</MenuItem>
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
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Başlangıç Tarihi"
                value={formData.startDate}
                onChange={(date) => handleChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Bitiş Tarihi"
                value={formData.endDate}
                onChange={(date) => handleChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>

          {/* Days of Week */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Günler *
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

          {/* Time Range */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="time"
              label="Başlangıç Saati"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="time"
              label="Bitiş Saati"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Frequency */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Tekrar Sıklığı</InputLabel>
              <Select
                value={formData.frequency}
                onChange={(e) => handleChange('frequency', e.target.value)}
                label="Tekrar Sıklığı"
              >
                {FREQUENCIES.map((freq) => (
                  <MenuItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Skip Holidays */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.skipHolidays}
                  onChange={(e) => handleChange('skipHolidays', e.target.checked)}
                />
              }
              label="Resmi tatilleri atla"
            />
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info">
              Program, seçilen tarih aralığında belirlediğiniz günlerde ve saatlerde
              otomatik olarak dersler oluşturacaktır. Eğitmen çakışmaları kontrol edilecektir.
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Oluşturuluyor...' : 'Program Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoScheduleDialog;
