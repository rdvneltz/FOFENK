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
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';

/**
 * Dialog for creating a single lesson on a specific date
 */
const CreateLessonDialog = ({ open, onClose, selectedDate, onSuccess }) => {
  const { institution, season, user, currentUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [allStudents, setAllStudents] = useState([]);  // All students in institution
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    studentId: '',  // For birebir (one-on-one) lessons
    startTime: '10:00',
    endTime: '12:00',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && institution && season) {
      fetchCourses();
      fetchInstructors();
      fetchAllStudents();  // Fetch all students
      // Reset form when dialog opens
      setFormData({
        courseId: '',
        instructorId: '',
        studentId: '',
        startTime: '10:00',
        endTime: '12:00',
        notes: ''
      });
      setError('');
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

  const validateForm = () => {
    if (!formData.courseId) {
      setError('Lütfen bir ders seçin');
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

      // Create scheduled lesson
      // Normalize date to noon UTC so it doesn't shift to the previous day
      // when serialized from local midnight (e.g. Turkey UTC+3 midnight
      // becomes previous-day 21:00 UTC → wrong day in DB).
      const d = selectedDate;
      const normalizedDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));

      const lessonData = {
        course: formData.courseId,
        instructor: formData.instructorId || null,
        student: formData.studentId || null,  // For birebir (one-on-one) lessons
        date: normalizedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        status: 'scheduled',
        notes: formData.notes,
        season: season._id,
        institution: institution._id,
        createdBy: currentUser?.username || user || 'System'
      };

      const response = await api.post('/scheduled-lessons', lessonData);

      if (response.data) {
        onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error('Error creating lesson:', error);
      setError(error.response?.data?.message || 'Ders oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      courseId: '',
      instructorId: '',
      studentId: '',
      startTime: '10:00',
      endTime: '12:00',
      notes: ''
    });
    setError('');
    onClose();
  };

  if (!selectedDate) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Add />
          Yeni Ders Oluştur
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
            {selectedDate.toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Typography>
        </Box>

        <Grid container spacing={2}>
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
            />
          </Grid>

          {/* Description - shown in calendar */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Açıklama (Takvimde Görünür)"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Örn: Ahmet Yılmaz - Birebir Ders"
              helperText="Bu açıklama takvimde ders kutucuğunda görünecektir (ör: öğrenci adı)"
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
          startIcon={<Add />}
        >
          {loading ? 'Oluşturuluyor...' : 'Ders Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateLessonDialog;
