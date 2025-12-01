import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Divider,
} from '@mui/material';
import { Close, PersonAdd, Add, Delete } from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';

const CreateTrialLessonDialog = ({ open, onClose, selectedDate, onSuccess }) => {
  const { user, institution, season } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    course: '',
    instructor: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    notes: '',
    referralSource: '',
    referralDetails: '',
    parentContacts: [],
  });

  // Format date to YYYY-MM-DD in local timezone (avoids UTC offset issue)
  const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (open) {
      loadData();
      setFormData(prev => ({
        ...prev,
        scheduledDate: formatDateLocal(selectedDate || new Date()),
      }));
      setError('');
    }
  }, [open, selectedDate]);

  const loadData = async () => {
    try {
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
            seasonId: season._id,
          },
        }),
      ]);
      setCourses(coursesRes.data);
      setInstructors(instructorsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleAddParentContact = () => {
    setFormData(prev => ({
      ...prev,
      parentContacts: [
        ...prev.parentContacts,
        { name: '', phone: '', email: '', relationship: '' }
      ]
    }));
  };

  const handleRemoveParentContact = (index) => {
    setFormData(prev => ({
      ...prev,
      parentContacts: prev.parentContacts.filter((_, i) => i !== index)
    }));
  };

  const handleParentContactChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      parentContacts: prev.parentContacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');

      // Validation
      if (!formData.firstName.trim()) {
        setError('Ad alanı zorunludur');
        return;
      }
      if (!formData.lastName.trim()) {
        setError('Soyad alanı zorunludur');
        return;
      }
      if (!formData.course) {
        setError('Ders seçimi zorunludur');
        return;
      }
      if (!formData.scheduledDate) {
        setError('Tarih zorunludur');
        return;
      }
      if (!formData.scheduledTime) {
        setError('Saat zorunludur');
        return;
      }

      const submitData = {
        ...formData,
        institution: institution._id,
        season: season._id,
        createdBy: user?.username
      };

      await api.post('/trial-lessons', submitData);

      alert('Deneme dersi başarıyla oluşturuldu!');

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        phone: '',
        email: '',
        course: '',
        instructor: '',
        scheduledDate: formatDateLocal(selectedDate || new Date()),
        scheduledTime: '',
        duration: 60,
        notes: '',
        referralSource: '',
        referralDetails: '',
        parentContacts: [],
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd color="warning" />
            <Typography variant="h6">Yeni Deneme Dersi</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Candidate Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Aday Bilgileri
            </Typography>
          </Grid>

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
              label="Doğum Tarihi"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
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
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Bizi Nasıl Duydu?</InputLabel>
              <Select
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                label="Bizi Nasıl Duydu?"
              >
                <MenuItem value="">Seçin</MenuItem>
                <MenuItem value="instagram">Instagram</MenuItem>
                <MenuItem value="facebook">Facebook</MenuItem>
                <MenuItem value="google">Google</MenuItem>
                <MenuItem value="friend">Arkadaş Tavsiyesi</MenuItem>
                <MenuItem value="flyer">El İlanı</MenuItem>
                <MenuItem value="other">Diğer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {formData.referralSource === 'other' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Detay"
                name="referralDetails"
                value={formData.referralDetails}
                onChange={handleChange}
                placeholder="Nasıl duyduğunu açıklayın"
              />
            </Grid>
          )}

          {/* Parent Contacts */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Veli Bilgileri (Opsiyonel)
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={handleAddParentContact}
              >
                Veli Ekle
              </Button>
            </Box>
          </Grid>

          {formData.parentContacts.map((contact, index) => (
            <Grid item xs={12} key={index}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Veli {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveParentContact(index)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Ad Soyad"
                      value={contact.name}
                      onChange={(e) => handleParentContactChange(index, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Telefon"
                      value={contact.phone}
                      onChange={(e) => handleParentContactChange(index, 'phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Yakınlık</InputLabel>
                      <Select
                        value={contact.relationship}
                        onChange={(e) => handleParentContactChange(index, 'relationship', e.target.value)}
                        label="Yakınlık"
                      >
                        <MenuItem value="">Seçin</MenuItem>
                        <MenuItem value="Anne">Anne</MenuItem>
                        <MenuItem value="Baba">Baba</MenuItem>
                        <MenuItem value="Vasi">Vasi</MenuItem>
                        <MenuItem value="Diğer">Diğer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}

          {/* Lesson Details */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Ders Bilgileri
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
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
            <FormControl fullWidth>
              <InputLabel>Eğitmen</InputLabel>
              <Select
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                label="Eğitmen"
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
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Tarih"
              name="scheduledDate"
              type="date"
              value={formData.scheduledDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Saat"
              name="scheduledTime"
              type="time"
              value={formData.scheduledTime}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Süre (dakika)"
              name="duration"
              type="number"
              value={formData.duration}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 15, max: 180, step: 15 } }}
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
              rows={2}
              placeholder="Ders öncesi notlar, özel istekler vb."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button
          variant="contained"
          color="warning"
          startIcon={<PersonAdd />}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Kaydediliyor...' : 'Deneme Dersi Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTrialLessonDialog;
