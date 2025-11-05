import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { formatPhoneNumber, unformatPhoneNumber } from '../utils/phoneFormatter';

const StudentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { institution, season } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    tcNo: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    motherName: '',
    motherSurname: '',
    motherPhone: '',
    fatherName: '',
    fatherSurname: '',
    fatherPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
    emergencyContactRelationship: 'Diğer',
    healthNotes: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadStudent();
    }
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/students/${id}`);
      const student = response.data;

      // Extract parent contacts
      const mother = student.parentContacts?.find(p => p.relationship === 'Anne') || {};
      const father = student.parentContacts?.find(p => p.relationship === 'Baba') || {};
      const emergency = student.emergencyContact || {};

      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        tcNo: student.tcNo || '',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        motherName: mother.name?.split(' ')[0] || '',
        motherSurname: mother.name?.split(' ').slice(1).join(' ') || '',
        motherPhone: mother.phone || '',
        fatherName: father.name?.split(' ')[0] || '',
        fatherSurname: father.name?.split(' ').slice(1).join(' ') || '',
        fatherPhone: father.phone || '',
        emergencyContactName: emergency.name || '',
        emergencyContactPhone: emergency.phone || '',
        emergencyContactEmail: emergency.email || '',
        emergencyContactRelationship: emergency.relationship || 'Diğer',
        healthNotes: student.healthNotes || '',
        notes: student.notes || '',
      });
    } catch (error) {
      setError('Öğrenci bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Telefon alanları için formatlama
    if (name === 'phone' || name === 'motherPhone' || name === 'fatherPhone' || name === 'emergencyContactPhone') {
      setFormData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Build parentContacts array
      const parentContacts = [];

      if (formData.motherName || formData.motherSurname || formData.motherPhone) {
        parentContacts.push({
          name: `${formData.motherName} ${formData.motherSurname}`.trim(),
          phone: formData.motherPhone,
          email: '',
          relationship: 'Anne'
        });
      }

      if (formData.fatherName || formData.fatherSurname || formData.fatherPhone) {
        parentContacts.push({
          name: `${formData.fatherName} ${formData.fatherSurname}`.trim(),
          phone: formData.fatherPhone,
          email: '',
          relationship: 'Baba'
        });
      }

      // Build emergencyContact object
      const emergencyContact = {
        name: formData.emergencyContactName,
        phone: formData.emergencyContactPhone,
        email: formData.emergencyContactEmail,
        relationship: formData.emergencyContactRelationship
      };

      const studentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        tcNo: formData.tcNo,
        dateOfBirth: formData.dateOfBirth,
        phone: unformatPhoneNumber(formData.phone),
        email: formData.email,
        address: formData.address,
        parentContacts: parentContacts.map(p => ({
          ...p,
          phone: unformatPhoneNumber(p.phone)
        })),
        emergencyContact: {
          ...emergencyContact,
          phone: unformatPhoneNumber(emergencyContact.phone)
        },
        healthNotes: formData.healthNotes,
        notes: formData.notes,
        institution: institution._id,
        season: season._id,
      };

      if (id) {
        await api.put(`/students/${id}`, studentData);
      } else {
        await api.post('/students', studentData);
      }

      navigate('/students');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <LoadingSpinner message="Öğrenci bilgileri yükleniyor..." />;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/students')}>
          Geri
        </Button>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {id ? 'Öğrenci Düzenle' : 'Yeni Öğrenci'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Kişisel Bilgiler
          </Typography>

          <Grid container spacing={3}>
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
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Anne Bilgileri
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Anne Adı"
                name="motherName"
                value={formData.motherName}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Anne Soyadı"
                name="motherSurname"
                value={formData.motherSurname}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Anne Telefon"
                name="motherPhone"
                value={formData.motherPhone}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Baba Bilgileri
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Baba Adı"
                name="fatherName"
                value={formData.fatherName}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Baba Soyadı"
                name="fatherSurname"
                value={formData.fatherSurname}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Baba Telefon"
                name="fatherPhone"
                value={formData.fatherPhone}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
            Acil Durum İletişim
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Acil Durum Kişisi Adı"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Acil Durum Telefon"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Acil Durum E-posta"
                name="emergencyContactEmail"
                type="email"
                value={formData.emergencyContactEmail}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Yakınlık Derecesi</InputLabel>
                <Select
                  name="emergencyContactRelationship"
                  value={formData.emergencyContactRelationship}
                  onChange={handleChange}
                  label="Yakınlık Derecesi"
                >
                  <MenuItem value="Anne">Anne</MenuItem>
                  <MenuItem value="Baba">Baba</MenuItem>
                  <MenuItem value="Vasi">Vasi</MenuItem>
                  <MenuItem value="Diğer">Diğer</MenuItem>
                </Select>
              </FormControl>
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
                placeholder="Alerjiler, kronik hastalıklar vb."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Diğer Notlar"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : id ? 'Güncelle' : 'Kaydet'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/students')}
            >
              İptal
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default StudentForm;
