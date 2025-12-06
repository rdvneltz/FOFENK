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
  Card,
  CardContent,
  TextField,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Close,
  Edit,
  Delete,
  Save,
  CheckCircle,
  Cancel,
  PersonAdd,
  Phone,
  Email,
  Schedule,
  WhatsApp,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';
import LoadingSpinner from '../Common/LoadingSpinner';
import ConvertToStudentDialog from './ConvertToStudentDialog';
import { sendWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATES } from '../../utils/whatsappHelper';

const TrialLessonDetailDialog = ({ open, onClose, trialLesson, onUpdated, onDeleted }) => {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [trialData, setTrialData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: 'pending',
    attended: false,
    feedbackNotes: '',
    interestedInEnrollment: null,
    notes: '',
  });

  useEffect(() => {
    if (open && trialLesson) {
      loadTrialLessonDetails();
    }
  }, [open, trialLesson]);

  const loadTrialLessonDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/trial-lessons/${trialLesson._id}`);
      setTrialData(response.data);
      setFormData({
        status: response.data.status || 'pending',
        attended: response.data.attended || false,
        feedbackNotes: response.data.feedbackNotes || '',
        interestedInEnrollment: response.data.interestedInEnrollment,
        notes: response.data.notes || '',
      });
    } catch (error) {
      console.error('Error loading trial lesson details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setSaving(true);
      await api.put(`/trial-lessons/${trialLesson._id}`, {
        status: newStatus,
        attended: newStatus === 'completed' ? true : formData.attended,
        updatedBy: user?.username
      });
      setFormData(prev => ({
        ...prev,
        status: newStatus,
        attended: newStatus === 'completed' ? true : prev.attended
      }));
      if (onUpdated) onUpdated();
    } catch (error) {
      alert('Durum güncellenirken hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put(`/trial-lessons/${trialLesson._id}`, {
        ...formData,
        updatedBy: user?.username
      });
      setEditMode(false);
      loadTrialLessonDetails();
      if (onUpdated) onUpdated();
      alert('Bilgiler kaydedildi!');
    } catch (error) {
      alert('Kaydetme hatası: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    // Special warning for converted trial lessons
    const isConverted = trialData?.status === 'converted' || trialData?.convertedToStudent;
    let confirmMessage = 'Bu deneme dersini silmek istediğinizden emin misiniz?';

    if (isConverted) {
      confirmMessage = '⚠️ DİKKAT!\n\nBu deneme dersi kesin kayıt almış bir derstir.\n\n' +
        'Deneme dersini silseniz bile, oluşturulmuş öğrenci kaydı ve ders kaydı SİLİNMEYECEKTİR.\n\n' +
        'Devam etmek istiyor musunuz?';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.delete(`/trial-lessons/${trialLesson._id}`, {
        data: { deletedBy: user?.username }
      });
      alert('Deneme dersi silindi!');
      if (onDeleted) onDeleted();
    } catch (error) {
      alert('Silme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleConvertSuccess = () => {
    setConvertDialogOpen(false);
    loadTrialLessonDetails();
    if (onUpdated) onUpdated();
  };

  const handleSendWhatsAppReminder = () => {
    if (!trialData) return;

    const phone = trialData.phone || (trialData.parentContacts && trialData.parentContacts[0]?.phone);

    if (!phone) {
      alert('Telefon numarası bulunamadı');
      return;
    }

    const data = {
      studentName: `${trialData.firstName} ${trialData.lastName}`,
      name: `${trialData.firstName} ${trialData.lastName}`,
      date: trialData.scheduledDate,
      time: trialData.scheduledTime,
      courseName: trialData.course?.name || '',
    };

    sendWhatsAppMessage(phone, DEFAULT_WHATSAPP_TEMPLATES.trialLessonReminder, data);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'converted':
        return 'primary';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      case 'converted':
        return 'Kayıt Oldu';
      default:
        return status;
    }
  };

  const getReferralLabel = (source) => {
    switch (source) {
      case 'instagram':
        return 'Instagram';
      case 'facebook':
        return 'Facebook';
      case 'google':
        return 'Google';
      case 'friend':
        return 'Arkadaş Tavsiyesi';
      case 'flyer':
        return 'El İlanı';
      case 'other':
        return 'Diğer';
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <LoadingSpinner message="Deneme dersi bilgileri yükleniyor..." />
        </DialogContent>
      </Dialog>
    );
  }

  if (!trialData) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">Deneme Dersi Detayı</Typography>
              <Chip
                label={getStatusLabel(formData.status)}
                color={getStatusColor(formData.status)}
                size="small"
              />
            </Box>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Student Information */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Aday Bilgileri
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Ad Soyad
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {trialData.firstName} {trialData.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Doğum Tarihi
                      </Typography>
                      <Typography variant="body1">
                        {trialData.dateOfBirth
                          ? new Date(trialData.dateOfBirth).toLocaleDateString('tr-TR')
                          : '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body1">
                          {trialData.phone || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        <Typography variant="body1">
                          {trialData.email || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    {trialData.parentContacts && trialData.parentContacts.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Veli Bilgileri
                        </Typography>
                        {trialData.parentContacts.map((parent, index) => (
                          <Typography key={index} variant="body1">
                            {parent.name} ({parent.relationship}) - {parent.phone}
                          </Typography>
                        ))}
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Bizi Nasıl Duydu?
                      </Typography>
                      <Typography variant="body1">
                        {getReferralLabel(trialData.referralSource)}
                        {trialData.referralDetails && ` - ${trialData.referralDetails}`}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Lesson Information */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Ders Bilgileri
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Ders
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {trialData.course?.name || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Eğitmen
                      </Typography>
                      <Typography variant="body1">
                        {trialData.instructor?.name || '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Tarih & Saat
                          </Typography>
                          <Typography variant="body1">
                            {trialData.scheduledDate
                              ? new Date(trialData.scheduledDate).toLocaleDateString('tr-TR', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })
                              : '-'} - {trialData.scheduledTime || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Süre
                      </Typography>
                      <Typography variant="body1">
                        {trialData.duration || 60} dakika
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Status and Feedback */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Durum & Geri Bildirim
                    </Typography>
                    {!editMode && formData.status !== 'converted' && (
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => setEditMode(true)}
                      >
                        Düzenle
                      </Button>
                    )}
                  </Box>

                  {formData.status === 'converted' ? (
                    <Alert severity="success">
                      Bu aday kesin kayıt olmuştur.
                      {trialData.student && (
                        <> Öğrenci: <strong>{trialData.student.firstName} {trialData.student.lastName}</strong></>
                      )}
                    </Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {/* Status Quick Actions */}
                      {formData.status === 'pending' && !editMode && (
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => handleStatusChange('completed')}
                              disabled={saving}
                            >
                              Tamamlandı
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<Cancel />}
                              onClick={() => handleStatusChange('cancelled')}
                              disabled={saving}
                            >
                              İptal Et
                            </Button>
                          </Box>
                        </Grid>
                      )}

                      {editMode ? (
                        <>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Durum</InputLabel>
                              <Select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                label="Durum"
                              >
                                <MenuItem value="pending">Bekliyor</MenuItem>
                                <MenuItem value="completed">Tamamlandı</MenuItem>
                                <MenuItem value="cancelled">İptal Edildi</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  name="attended"
                                  checked={formData.attended}
                                  onChange={handleChange}
                                />
                              }
                              label="Derse katıldı"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Kayıt olmak istiyor mu?</InputLabel>
                              <Select
                                name="interestedInEnrollment"
                                value={formData.interestedInEnrollment === null ? '' : formData.interestedInEnrollment}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  interestedInEnrollment: e.target.value === '' ? null : e.target.value === 'true'
                                }))}
                                label="Kayıt olmak istiyor mu?"
                              >
                                <MenuItem value="">Belirsiz</MenuItem>
                                <MenuItem value="true">Evet</MenuItem>
                                <MenuItem value="false">Hayır</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Ders Öncesi Notlar"
                              name="notes"
                              value={formData.notes}
                              onChange={handleChange}
                              multiline
                              rows={2}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Ders Sonrası Geri Bildirim"
                              name="feedbackNotes"
                              value={formData.feedbackNotes}
                              onChange={handleChange}
                              multiline
                              rows={3}
                              placeholder="Ders nasıl geçti? Aday memnun kaldı mı? Notlarınız..."
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                              <Button onClick={() => setEditMode(false)}>
                                İptal
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSave}
                                disabled={saving}
                              >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                              </Button>
                            </Box>
                          </Grid>
                        </>
                      ) : (
                        <>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Katılım Durumu
                            </Typography>
                            <Typography variant="body1">
                              {formData.attended ? 'Katıldı' : 'Katılmadı'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Kayıt Olmak İstiyor mu?
                            </Typography>
                            <Typography variant="body1">
                              {formData.interestedInEnrollment === true
                                ? 'Evet'
                                : formData.interestedInEnrollment === false
                                  ? 'Hayır'
                                  : 'Belirsiz'}
                            </Typography>
                          </Grid>
                          {trialData.notes && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Ders Öncesi Notlar
                              </Typography>
                              <Typography variant="body1">
                                {trialData.notes}
                              </Typography>
                            </Grid>
                          )}
                          {trialData.feedbackNotes && (
                            <Grid item xs={12}>
                              <Typography variant="body2" color="text.secondary">
                                Ders Sonrası Geri Bildirim
                              </Typography>
                              <Typography variant="body1">
                                {trialData.feedbackNotes}
                              </Typography>
                            </Grid>
                          )}
                        </>
                      )}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Kapat</Button>
          <Box sx={{ flex: 1 }} />
          {formData.status === 'pending' && (
            <Button
              startIcon={<WhatsApp />}
              onClick={handleSendWhatsAppReminder}
              sx={{
                color: '#25D366',
                borderColor: '#25D366',
                '&:hover': {
                  borderColor: '#128C7E',
                  bgcolor: 'rgba(37, 211, 102, 0.08)',
                },
              }}
              variant="outlined"
            >
              Hatırlatma
            </Button>
          )}
          <Button
            startIcon={<Delete />}
            color="error"
            onClick={handleDelete}
          >
            Sil
          </Button>
          {formData.status !== 'converted' && (formData.status === 'completed' || formData.attended) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAdd />}
              onClick={() => setConvertDialogOpen(true)}
            >
              Kesin Kayıt Al
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Convert to Student Dialog */}
      <ConvertToStudentDialog
        open={convertDialogOpen}
        onClose={() => setConvertDialogOpen(false)}
        trialLesson={trialData}
        onSuccess={handleConvertSuccess}
      />
    </>
  );
};

export default TrialLessonDetailDialog;
