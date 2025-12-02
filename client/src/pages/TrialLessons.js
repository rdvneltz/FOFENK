import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  PersonAdd,
  Visibility,
  Delete,
  Phone,
  CalendarMonth,
  WhatsApp,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TrialLessonDetailDialog from '../components/Calendar/TrialLessonDetailDialog';
import ConvertToStudentDialog from '../components/Calendar/ConvertToStudentDialog';
import { sendWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATES } from '../utils/whatsappHelper';

const TrialLessons = () => {
  const { institution, season, user } = useApp();
  const [trials, setTrials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [courseFilter, setCourseFilter] = useState('');
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

  useEffect(() => {
    if (institution && season) {
      loadData();
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trialsRes, coursesRes, instructorsRes] = await Promise.all([
        api.get('/trial-lessons', {
          params: {
            institution: institution._id,
            season: season._id,
          },
        }),
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
      setTrials(trialsRes.data);
      setCourses(coursesRes.data);
      setInstructors(instructorsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phone: '',
      email: '',
      course: '',
      instructor: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '',
      duration: 60,
      notes: '',
      referralSource: '',
      referralDetails: '',
      parentContacts: [],
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddParentContact = () => {
    setFormData(prev => ({
      ...prev,
      parentContacts: [
        ...prev.parentContacts,
        { name: '', phone: '', relationship: '' }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    setLoading(true);

    try {
      const trialData = {
        ...formData,
        institution: institution._id,
        season: season._id,
        createdBy: user?.username,
      };

      await api.post('/trial-lessons', trialData);
      await loadData();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/trial-lessons/${id}`, {
        status,
        attended: status === 'completed',
        updatedBy: user?.username
      });
      await loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Durum güncellenemedi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu deneme dersini silmek istediğinizden emin misiniz?')) {
      return;
    }
    try {
      await api.delete(`/trial-lessons/${id}`, {
        data: { deletedBy: user?.username }
      });
      await loadData();
    } catch (error) {
      setError(error.response?.data?.message || 'Silme hatası');
    }
  };

  const handleViewDetail = (trial) => {
    setSelectedTrial(trial);
    setDetailDialogOpen(true);
  };

  const handleConvert = (trial) => {
    setSelectedTrial(trial);
    setConvertDialogOpen(true);
  };

  const handleDetailClose = () => {
    setDetailDialogOpen(false);
    setSelectedTrial(null);
  };

  const handleConvertClose = () => {
    setConvertDialogOpen(false);
    setSelectedTrial(null);
  };

  const handleUpdated = () => {
    loadData();
  };

  const handleConvertSuccess = () => {
    setConvertDialogOpen(false);
    setSelectedTrial(null);
    loadData();
  };

  const handleSendWhatsAppReminder = (trial) => {
    const phone = trial.phone || (trial.parentContacts && trial.parentContacts[0]?.phone);

    if (!phone) {
      setError('Telefon numarası bulunamadı');
      return;
    }

    const data = {
      studentName: `${trial.firstName} ${trial.lastName}`,
      name: `${trial.firstName} ${trial.lastName}`,
      date: trial.scheduledDate,
      time: trial.scheduledTime,
      courseName: trial.course?.name || '',
    };

    sendWhatsAppMessage(phone, DEFAULT_WHATSAPP_TEMPLATES.trialLessonReminder, data);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'completed':
        return <Chip label="Tamamlandı" color="success" size="small" />;
      case 'cancelled':
        return <Chip label="İptal" color="error" size="small" />;
      case 'converted':
        return <Chip label="Kayıt Oldu" color="primary" size="small" />;
      default:
        return <Chip label="Bekliyor" color="warning" size="small" />;
    }
  };

  const getReferralLabel = (source) => {
    switch (source) {
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      case 'google': return 'Google';
      case 'friend': return 'Arkadaş';
      case 'flyer': return 'El İlanı';
      case 'other': return 'Diğer';
      default: return '-';
    }
  };

  const filteredTrials = trials.filter(trial => {
    // Course filter
    if (courseFilter && trial.course?._id !== courseFilter) {
      return false;
    }

    // Status tab filter
    switch (tabValue) {
      case 0: return true; // All
      case 1: return trial.status === 'pending';
      case 2: return trial.status === 'completed';
      case 3: return trial.status === 'converted';
      case 4: return trial.status === 'cancelled';
      default: return true;
    }
  });

  // Sort by date (most recent first)
  const sortedTrials = [...filteredTrials].sort((a, b) =>
    new Date(b.scheduledDate) - new Date(a.scheduledDate)
  );

  if (loading && trials.length === 0) {
    return <LoadingSpinner message="Deneme dersleri yükleniyor..." />;
  }

  if (!institution || !season) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum ve sezon seçin
        </Typography>
      </Box>
    );
  }

  const pendingCount = trials.filter(t => t.status === 'pending').length;
  const completedCount = trials.filter(t => t.status === 'completed').length;
  const convertedCount = trials.filter(t => t.status === 'converted').length;
  const cancelledCount = trials.filter(t => t.status === 'cancelled').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Deneme Dersleri</Typography>
        <Button variant="contained" color="warning" startIcon={<Add />} onClick={handleOpenDialog}>
          Yeni Deneme Dersi
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
            <Typography variant="h4">{pendingCount}</Typography>
            <Typography variant="body2">Bekliyor</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
            <Typography variant="h4">{completedCount}</Typography>
            <Typography variant="body2">Tamamlandı</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h4">{convertedCount}</Typography>
            <Typography variant="body2">Kayıt Oldu</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
            <Typography variant="h4">{cancelledCount}</Typography>
            <Typography variant="body2">İptal</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Course Filter and Tabs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Paper sx={{ flex: 1 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label={`Tümü (${trials.length})`} />
            <Tab label={`Bekliyor (${pendingCount})`} />
            <Tab label={`Tamamlandı (${completedCount})`} />
            <Tab label={`Kayıt Oldu (${convertedCount})`} />
            <Tab label={`İptal (${cancelledCount})`} />
          </Tabs>
        </Paper>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Ders Filtrele</InputLabel>
          <Select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            label="Ders Filtrele"
          >
            <MenuItem value="">Tüm Dersler</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course._id} value={course._id}>
                {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Aday</TableCell>
              <TableCell>İletişim</TableCell>
              <TableCell>Ders</TableCell>
              <TableCell>Tarih & Saat</TableCell>
              <TableCell>Kaynak</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTrials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">Deneme dersi kaydı yok</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedTrials.map((trial) => (
                <TableRow key={trial._id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {trial.firstName} {trial.lastName}
                    </Typography>
                    {trial.dateOfBirth && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(trial.dateOfBirth).toLocaleDateString('tr-TR')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{trial.phone || '-'}</Typography>
                    </Box>
                    {trial.email && (
                      <Typography variant="caption" color="text.secondary">
                        {trial.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{trial.course?.name || '-'}</Typography>
                    {trial.instructor && (trial.instructor.firstName || trial.instructor.name) && (
                      <Typography variant="caption" color="text.secondary">
                        {trial.instructor.name || `${trial.instructor.firstName || ''} ${trial.instructor.lastName || ''}`.trim()}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarMonth fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body2">
                          {trial.scheduledDate && new Date(trial.scheduledDate).toLocaleDateString('tr-TR')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {trial.scheduledTime} ({trial.duration || 60} dk)
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getReferralLabel(trial.referralSource)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(trial.status)}
                    {trial.interestedInEnrollment === true && (
                      <Chip
                        label="İlgili"
                        size="small"
                        color="info"
                        sx={{ ml: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Detay">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(trial)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {trial.status === 'pending' && (
                        <>
                          <Tooltip title="WhatsApp Hatırlatma">
                            <IconButton
                              size="small"
                              onClick={() => handleSendWhatsAppReminder(trial)}
                              sx={{ color: '#25D366' }}
                            >
                              <WhatsApp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Tamamlandı">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleUpdateStatus(trial._id, 'completed')}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="İptal Et">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleUpdateStatus(trial._id, 'cancelled')}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}

                      {(trial.status === 'completed' || trial.attended) && trial.status !== 'converted' && (
                        <Tooltip title="Kesin Kayıt Al">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleConvert(trial)}
                          >
                            <PersonAdd fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {trial.status !== 'converted' && (
                        <Tooltip title="Sil">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(trial._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Trial Lesson Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Yeni Deneme Dersi</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* Personal Info */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Aday Bilgileri
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Adı"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Soyadı"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
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

              {/* Parent Contacts */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Veli Bilgileri (Opsiyonel)
                  </Typography>
                  <Button size="small" onClick={handleAddParentContact}>
                    + Veli Ekle
                  </Button>
                </Box>
              </Grid>
              {formData.parentContacts.map((contact, index) => (
                <Grid item xs={12} key={index}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Ad Soyad"
                          value={contact.name}
                          onChange={(e) => handleParentContactChange(index, 'name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Telefon"
                          value={contact.phone}
                          onChange={(e) => handleParentContactChange(index, 'phone', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
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
                      <Grid item xs={12} sm={1}>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveParentContact(index)}
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              ))}

              {/* Lesson Info */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
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
                  label="Süre (dk)"
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
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained" color="warning" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Detail Dialog */}
      {selectedTrial && (
        <TrialLessonDetailDialog
          open={detailDialogOpen}
          onClose={handleDetailClose}
          trialLesson={selectedTrial}
          onUpdated={handleUpdated}
          onDeleted={() => {
            handleDetailClose();
            loadData();
          }}
        />
      )}

      {/* Convert to Student Dialog */}
      {selectedTrial && (
        <ConvertToStudentDialog
          open={convertDialogOpen}
          onClose={handleConvertClose}
          trialLesson={selectedTrial}
          onSuccess={handleConvertSuccess}
        />
      )}
    </Box>
  );
};

export default TrialLessons;
