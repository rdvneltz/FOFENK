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
import { tr } from 'date-fns/locale';
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

const FREQUENCIES = [
  { value: 'weekly', label: 'Haftalık' },
  { value: 'biweekly', label: 'İki Haftada Bir' },
  { value: 'monthly', label: 'Aylık' }
];

const AutoScheduleDialog = ({ open, onClose, onSuccess }) => {
  const { institution, season, user, currentUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [allStudents, setAllStudents] = useState([]);  // All students in institution
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    studentId: '',  // For birebir (one-on-one) lessons
    startDate: null,
    endDate: null,
    daysOfWeek: [],
    startTime: '10:00',
    endTime: '12:00',
    frequency: 'weekly',
    skipHolidays: true,
    notes: ''
  });
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (open && institution && season) {
      fetchCourses();
      fetchInstructors();
      fetchAllStudents();  // Fetch all students
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

  const fetchAllStudents = async () => {
    try {
      const response = await api.get('/students', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      // Sort students by name
      const students = response.data
        .map(s => ({
          _id: s._id,
          firstName: s.firstName,
          lastName: s.lastName
        }))
        .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr'));
      setAllStudents(students);
    } catch (error) {
      console.error('Error fetching students:', error);
      setAllStudents([]);
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

  const checkConflicts = async () => {
    try {
      // Get existing lessons for this course in the date range
      const response = await api.get('/scheduled-lessons', {
        params: {
          courseId: formData.courseId,
          startDate: formData.startDate.toISOString(),
          endDate: formData.endDate.toISOString()
        }
      });

      const existingLessons = response.data;

      // Check for time conflicts
      const conflictingLessons = existingLessons.filter(lesson => {
        const lessonDay = new Date(lesson.date).getDay();
        const hasTimeOverlap =
          formData.daysOfWeek.includes(lessonDay) &&
          lesson.startTime === formData.startTime &&
          lesson.endTime === formData.endTime;

        return hasTimeOverlap && lesson.status !== 'cancelled';
      });

      return conflictingLessons;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Check for conflicts first
    setLoading(true);
    const conflictingLessons = await checkConflicts();
    setLoading(false);

    if (conflictingLessons.length > 0) {
      setConflicts(conflictingLessons);
      setShowConfirmDialog(true);
    } else {
      await proceedWithGeneration();
    }
  };

  const proceedWithGeneration = async () => {
    try {
      setLoading(true);
      setShowConfirmDialog(false);

      const response = await api.post('/scheduled-lessons/generate-schedule', {
        courseId: formData.courseId,
        instructorId: formData.instructorId || null,
        studentId: formData.studentId || null,  // For birebir (one-on-one) lessons
        startDate: formData.startDate,
        endDate: formData.endDate,
        daysOfWeek: formData.daysOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        frequency: formData.frequency,
        seasonId: season._id,
        institutionId: institution._id,
        skipHolidays: formData.skipHolidays,
        notes: formData.notes,
        createdBy: currentUser?.username || user || 'System'
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
      studentId: '',
      startDate: null,
      endDate: null,
      daysOfWeek: [],
      startTime: '10:00',
      endTime: '12:00',
      frequency: 'weekly',
      skipHolidays: true,
      notes: ''
    });
    setError('');
    setConflicts(null);
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <>
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

          {/* Student Selection - for birebir (one-on-one) lessons */}
          {allStudents.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Öğrenci (Birebir Ders)</InputLabel>
                <Select
                  value={formData.studentId}
                  onChange={(e) => handleChange('studentId', e.target.value)}
                  label="Öğrenci (Birebir Ders)"
                >
                  <MenuItem value="">Grup Dersi (Tüm Öğrenciler)</MenuItem>
                  {allStudents.map((student) => (
                    <MenuItem key={student._id} value={student._id}>
                      {student.firstName} {student.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Birebir ders için öğrenci seçin. Grup dersi ise boş bırakın.
              </Typography>
            </Grid>
          )}

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

          {/* Description - shown in calendar */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Açıklama (Takvimde Görünür)"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Örn: Ahmet Yılmaz - Birebir Diksiyon"
              helperText="Bu açıklama oluşturulan tüm derslerin takvim kutucuğunda görünecektir (ör: öğrenci adı)"
            />
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info">
              Program, seçilen tarih aralığında belirlediğiniz günlerde ve saatlerde
              otomatik olarak dersler oluşturacaktır. Eğitmen çakışmaları kontrol edilecektir.
              <Box sx={{ mt: 1, fontWeight: 500 }}>
                Not: Farklı günler için farklı saatler seçmek isterseniz, her saat aralığı için ayrı ayrı program oluşturun.
              </Box>
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

      {/* Conflict Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ders Çakışması Uyarısı</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bu tarih aralığında <strong>{conflicts?.length || 0} adet</strong> ders zaten mevcut
            ve seçtiğiniz gün/saat ile çakışıyor.
          </Alert>
          <Typography variant="body2" gutterBottom>
            Yine de devam etmek istiyor musunuz? Aynı gün ve saatte birden fazla ders
            oluşturulacaktır. Bu, farklı gruplar veya eğitmenler için normal olabilir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            İptal
          </Button>
          <Button
            onClick={proceedWithGeneration}
            variant="contained"
            color="warning"
            disabled={loading}
          >
            Yine De Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AutoScheduleDialog;
