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
  const [formData, setFormData] = useState({
    courseId: '',
    instructorId: '',
    startTime: '10:00',
    endTime: '12:00',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && institution && season) {
      fetchCourses();
      fetchInstructors();
      // Reset form when dialog opens
      setFormData({
        courseId: '',
        instructorId: '',
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
      const lessonData = {
        course: formData.courseId,
        instructor: formData.instructorId || null,
        date: selectedDate,
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

          {/* Notes */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notlar (Opsiyonel)"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Bu dersle ilgili notlar..."
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
