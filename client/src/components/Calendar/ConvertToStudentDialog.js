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
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import { Close, PersonAdd, Add, Delete } from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';

const ConvertToStudentDialog = ({ open, onClose, trialLesson, onSuccess }) => {
  const { user, institution, season } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    tcNo: '',
    address: '',
    healthNotes: '',
    notes: '',
    parentContacts: [],
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    enrollInCourse: true,
    enrollmentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (open && trialLesson) {
      // Pre-fill form with trial lesson data
      setFormData({
        firstName: trialLesson.firstName || '',
        lastName: trialLesson.lastName || '',
        dateOfBirth: trialLesson.dateOfBirth
          ? new Date(trialLesson.dateOfBirth).toISOString().split('T')[0]
          : '',
        phone: trialLesson.phone || '',
        email: trialLesson.email || '',
        tcNo: '',
        address: '',
        healthNotes: '',
        notes: trialLesson.notes || '',
        parentContacts: trialLesson.parentContacts || [],
        emergencyContact: {
          name: trialLesson.parentContacts?.[0]?.name || '',
          phone: trialLesson.parentContacts?.[0]?.phone || '',
          relationship: trialLesson.parentContacts?.[0]?.relationship || ''
        },
        enrollInCourse: true,
        enrollmentDate: new Date().toISOString().split('T')[0],
      });
      setError('');
    }
  }, [open, trialLesson]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleEmergencyContactChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value
      }
    }));
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

      const submitData = {
        ...formData,
        createdBy: user?.username
      };

      const response = await api.post(`/trial-lessons/${trialLesson._id}/convert-to-student`, submitData);

      alert(`${response.data.student.firstName} ${response.data.student.lastName} başarıyla kaydedildi!`);

      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (!trialLesson) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd color="primary" />
            <Typography variant="h6">Kesin Kayıt Al</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>{trialLesson.firstName} {trialLesson.lastName}</strong> için{' '}
          <strong>{trialLesson.course?.name}</strong> dersine kesin kayıt oluşturulacak.
          Bilgileri kontrol edin ve eksik alanları doldurun.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Personal Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Kişisel Bilgiler
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

          {/* Emergency Contact */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Acil Durum İletişim
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Ad Soyad"
              name="name"
              value={formData.emergencyContact.name}
              onChange={handleEmergencyContactChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Telefon"
              name="phone"
              value={formData.emergencyContact.phone}
              onChange={handleEmergencyContactChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Yakınlık</InputLabel>
              <Select
                name="relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleEmergencyContactChange}
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

          {/* Parent Contacts */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Veli Bilgileri
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
                    <TextField
                      fullWidth
                      size="small"
                      label="E-posta"
                      value={contact.email}
                      onChange={(e) => handleParentContactChange(index, 'email', e.target.value)}
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

          {/* Health Notes */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Sağlık Bilgileri & Notlar
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Sağlık Notları"
              name="healthNotes"
              value={formData.healthNotes}
              onChange={handleChange}
              multiline
              rows={2}
              placeholder="Alerji, kronik hastalık vb. bilgiler"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Genel Notlar"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              multiline
              rows={2}
            />
          </Grid>

          {/* Course Enrollment */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Kurs Kaydı
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  name="enrollInCourse"
                  checked={formData.enrollInCourse}
                  onChange={handleChange}
                />
              }
              label={
                <Typography>
                  <strong>{trialLesson.course?.name}</strong> dersine kaydet
                </Typography>
              }
            />
          </Grid>
          {formData.enrollInCourse && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Kayıt Tarihi"
                name="enrollmentDate"
                type="date"
                value={formData.enrollmentDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAdd />}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Kaydediliyor...' : 'Öğrenci Olarak Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConvertToStudentDialog;
