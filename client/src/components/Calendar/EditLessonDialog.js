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
  FormControlLabel,
  Checkbox,
  Divider,
  Radio,
  RadioGroup,
  FormLabel,
} from '@mui/material';
import { Edit, Save } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import api from '../../api';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Pazar' },
  { value: 1, label: 'Pazartesi' },
  { value: 2, label: 'Salı' },
  { value: 3, label: 'Çarşamba' },
  { value: 4, label: 'Perşembe' },
  { value: 5, label: 'Cuma' },
  { value: 6, label: 'Cumartesi' },
];

/**
 * Dialog for editing a lesson with options to update future lessons
 */
const EditLessonDialog = ({ open, onClose, lesson, onSuccess }) => {
  const { institution, season, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [futureCount, setFutureCount] = useState(0);

  const [formData, setFormData] = useState({
    date: null,
    startTime: '',
    endTime: '',
    instructorId: '',
    studentId: '',  // For birebir (one-on-one) lessons
    notes: '',
  });

  const [updateScope, setUpdateScope] = useState('single'); // 'single' or 'future'
  const [futureUpdateOptions, setFutureUpdateOptions] = useState({
    updateTime: true,
    updateInstructor: true,
    updateNotes: true,
    newDayOfWeek: null, // null = keep same day pattern, number = change to new day
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (open && lesson && institution && season) {
      fetchData();
      initializeForm();
    }
  }, [open, lesson, institution, season]);

  const fetchData = async () => {
    try {
      const courseId = lesson.course?._id || lesson.course;

      // Fetch courses
      const coursesRes = await api.get('/courses', {
        params: {
          institution: institution._id,
          season: season._id
        }
      });
      setCourses(coursesRes.data);

      // Fetch instructors
      const instructorsRes = await api.get('/instructors', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      setInstructors(instructorsRes.data);

      // Fetch enrolled students for this course
      if (courseId) {
        const enrollmentsRes = await api.get('/enrollments', {
          params: {
            courseId: courseId,
            institutionId: institution._id,
            seasonId: season._id
          }
        });
        const students = enrollmentsRes.data
          .filter(e => e.student)
          .map(e => ({
            _id: e.student._id,
            firstName: e.student.firstName,
            lastName: e.student.lastName
          }));
        setEnrolledStudents(students);
      }

      // Count future lessons for this course
      const futureRes = await api.get('/scheduled-lessons', {
        params: {
          courseId: courseId,
          startDate: new Date(lesson.date).toISOString(),
          status: 'scheduled'
        }
      });
      // Filter to only include lessons on same day of week and time
      const lessonDate = new Date(lesson.date);
      const dayOfWeek = lessonDate.getDay();
      const sameDayLessons = futureRes.data.filter(l => {
        const d = new Date(l.date);
        return d.getDay() === dayOfWeek &&
               l.startTime === lesson.startTime &&
               d >= lessonDate;
      });
      setFutureCount(sameDayLessons.length);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const initializeForm = () => {
    setFormData({
      date: new Date(lesson.date),
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
      instructorId: lesson.instructor?._id || lesson.instructor || '',
      studentId: lesson.student?._id || lesson.student || '',
      notes: lesson.notes || '',
    });
    setUpdateScope('single');
    setFutureUpdateOptions({
      updateTime: true,
      updateInstructor: true,
      updateNotes: true,
      newDayOfWeek: null,
    });
    setError('');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleFutureOptionChange = (field, value) => {
    setFutureUpdateOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.date) {
      setError('Lütfen bir tarih seçin');
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

      if (updateScope === 'single') {
        // Update only this lesson
        await api.put(`/scheduled-lessons/${lesson._id}`, {
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          instructor: formData.instructorId || null,
          student: formData.studentId || null,  // For birebir (one-on-one) lessons
          notes: formData.notes,
          updatedBy: user?.username || 'System'
        });
      } else {
        // Update this and all future lessons
        await api.put('/scheduled-lessons/bulk-update-future', {
          lessonId: lesson._id,
          courseId: lesson.course?._id || lesson.course,
          fromDate: new Date(lesson.date).toISOString(),
          originalDayOfWeek: new Date(lesson.date).getDay(),
          originalStartTime: lesson.startTime,
          updates: {
            ...(futureUpdateOptions.updateTime && {
              startTime: formData.startTime,
              endTime: formData.endTime,
            }),
            ...(futureUpdateOptions.updateInstructor && {
              instructor: formData.instructorId || null,
            }),
            ...(futureUpdateOptions.updateNotes && {
              notes: formData.notes,
            }),
          },
          newDayOfWeek: futureUpdateOptions.newDayOfWeek,
          updatedBy: user?.username || 'System'
        });
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating lesson:', error);
      setError(error.response?.data?.message || 'Ders güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      date: null,
      startTime: '',
      endTime: '',
      instructorId: '',
      studentId: '',
      notes: '',
    });
    setEnrolledStudents([]);
    setError('');
    setUpdateScope('single');
    onClose();
  };

  if (!lesson) {
    return null;
  }

  const originalDate = new Date(lesson.date);
  const originalDayOfWeek = originalDate.getDay();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit />
          Ders Düzenle
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2, mt: 1, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="subtitle1" color="primary.contrastText">
            {lesson.course?.name || 'Ders'}
          </Typography>
          <Typography variant="body2" color="primary.contrastText" sx={{ opacity: 0.9 }}>
            {originalDate.toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })} - {lesson.startTime}-{lesson.endTime}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Update Scope Selection */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Güncelleme Kapsamı</FormLabel>
              <RadioGroup
                value={updateScope}
                onChange={(e) => setUpdateScope(e.target.value)}
              >
                <FormControlLabel
                  value="single"
                  control={<Radio />}
                  label="Sadece bu dersi güncelle"
                />
                <FormControlLabel
                  value="future"
                  control={<Radio />}
                  label={`Bu dersi ve gelecekteki tüm dersleri güncelle (${futureCount} ders)`}
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Date - only for single lesson update */}
          {updateScope === 'single' && (
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                  label="Tarih"
                  value={formData.date}
                  onChange={(date) => handleChange('date', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
          )}

          {/* Future Update Options */}
          {updateScope === 'future' && (
            <>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  Aşağıdaki seçenekler, bu tarihten ({originalDate.toLocaleDateString('tr-TR')}) sonraki
                  aynı gün ve saatteki tüm <strong>{lesson.course?.name}</strong> derslerine uygulanacaktır.
                </Alert>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Hangi alanlar güncellensin?
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={futureUpdateOptions.updateTime}
                      onChange={(e) => handleFutureOptionChange('updateTime', e.target.checked)}
                    />
                  }
                  label="Saat değişikliği"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={futureUpdateOptions.updateInstructor}
                      onChange={(e) => handleFutureOptionChange('updateInstructor', e.target.checked)}
                    />
                  }
                  label="Eğitmen değişikliği"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={futureUpdateOptions.updateNotes}
                      onChange={(e) => handleFutureOptionChange('updateNotes', e.target.checked)}
                    />
                  }
                  label="Açıklama değişikliği"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Gün Değişikliği (Opsiyonel)</InputLabel>
                  <Select
                    value={futureUpdateOptions.newDayOfWeek ?? ''}
                    onChange={(e) => handleFutureOptionChange('newDayOfWeek', e.target.value === '' ? null : e.target.value)}
                    label="Gün Değişikliği (Opsiyonel)"
                  >
                    <MenuItem value="">
                      <em>Aynı gün kalsin ({DAYS_OF_WEEK.find(d => d.value === originalDayOfWeek)?.label})</em>
                    </MenuItem>
                    {DAYS_OF_WEEK.filter(d => d.value !== originalDayOfWeek).map((day) => (
                      <MenuItem key={day.value} value={day.value}>
                        {day.label}'ye taşı
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Time Range */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              required
              type="time"
              label="Başlangıç Saati"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={updateScope === 'future' && !futureUpdateOptions.updateTime}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              required
              type="time"
              label="Bitiş Saati"
              value={formData.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={updateScope === 'future' && !futureUpdateOptions.updateTime}
            />
          </Grid>

          {/* Instructor Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth disabled={updateScope === 'future' && !futureUpdateOptions.updateInstructor}>
              <InputLabel>Eğitmen</InputLabel>
              <Select
                value={formData.instructorId}
                onChange={(e) => handleChange('instructorId', e.target.value)}
                label="Eğitmen"
              >
                <MenuItem value="">
                  <em>Seçilmedi</em>
                </MenuItem>
                {instructors.map((instructor) => (
                  <MenuItem key={instructor._id} value={instructor._id}>
                    {instructor.firstName} {instructor.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Student Selection - for birebir (one-on-one) lessons - only for single lesson update */}
          {updateScope === 'single' && enrolledStudents.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Öğrenci (Birebir Ders)</InputLabel>
                <Select
                  value={formData.studentId}
                  onChange={(e) => handleChange('studentId', e.target.value)}
                  label="Öğrenci (Birebir Ders)"
                >
                  <MenuItem value="">Grup Dersi (Tüm Öğrenciler)</MenuItem>
                  {enrolledStudents.map((student) => (
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

          {/* Notes/Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Açıklama (Takvimde Görünür)"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Örn: Ahmet Yılmaz - Birebir Ders"
              helperText="Bu açıklama takvimde ders kutucuğunda görünecektir"
              disabled={updateScope === 'future' && !futureUpdateOptions.updateNotes}
            />
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
          startIcon={<Save />}
        >
          {loading ? 'Kaydediliyor...' : (updateScope === 'single' ? 'Kaydet' : `${futureCount} Dersi Güncelle`)}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditLessonDialog;
