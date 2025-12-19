import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Box,
  Divider,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Warning as WarningIcon, Person, Business, School, Delete, CloudUpload, Image as ImageIcon } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Institutions from './Institutions';
import InstitutionSetup from './InstitutionSetup';
import SeasonManagement from './SeasonManagement';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { institution, currentUser } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    vatRate: 10,
    creditCardCommission: 2.5,
    defaultInstallments: 1,
    logo: '',
    invoiceHeader: '',
  });

  const [cardCommissions, setCardCommissions] = useState({
    single: 4,
    installment2: 6.5,
    installment3: 9,
    installment4: 11.5,
    installment5: 14,
    installment6: 16.5,
    installment7: 19,
    installment8: 21.5,
    installment9: 24,
    installment10: 26.5,
    installment11: 29,
    installment12: 31.5
  });

  // Letterhead settings
  const [letterhead, setLetterhead] = useState({
    imageUrl: null,
    topMargin: 120,
    bottomMargin: 60,
    sideMargin: 40
  });
  const [letterheadFile, setLetterheadFile] = useState(null);
  const [letterheadPreview, setLetterheadPreview] = useState(null);
  const [letterheadUploading, setLetterheadUploading] = useState(false);

  const [resetDialog, setResetDialog] = useState({
    open: false,
    step: 0, // 0: select institution, 1: select data types, 2: select users, 3: confirm & password
    username: '',
    password: '',
    error: '',
    processing: false,
    selectedInstitution: '', // '' = all institutions
    dataTypes: {
      students: true,
      courses: true,
      enrollments: true,
      scheduledLessons: true,
      attendance: true,
      trialLessons: true,
      paymentPlans: true,
      payments: true,
      expenses: true,
      cashRegisters: true,
      instructors: true,
      activityLogs: true,
      settings: true,
    },
    deleteSeasons: false,
    deleteInstitutions: false,
    deleteUsers: false,
    usersToDelete: [],
  });
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (institution) {
      loadSettings();
    }
  }, [institution]);

  const loadSettings = async () => {
    if (!institution) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/settings/institution/${institution._id}`);
      if (response.data) {
        setFormData({
          vatRate: response.data.vatRate || 10,
          creditCardCommission: response.data.creditCardCommission || 2.5,
          defaultInstallments: response.data.defaultInstallments || 1,
          logo: response.data.logo || '',
          invoiceHeader: response.data.invoiceHeader || '',
        });

        // Convert creditCardRates from backend to cardCommissions format
        if (response.data.creditCardRates && Array.isArray(response.data.creditCardRates)) {
          const rates = response.data.creditCardRates;
          const commissionsMap = {};
          rates.forEach(rate => {
            if (rate.installments === 1) commissionsMap.single = rate.rate;
            else commissionsMap[`installment${rate.installments}`] = rate.rate;
          });
          setCardCommissions({
            single: commissionsMap.single ?? 4,
            installment2: commissionsMap.installment2 ?? 6.5,
            installment3: commissionsMap.installment3 ?? 9,
            installment4: commissionsMap.installment4 ?? 11.5,
            installment5: commissionsMap.installment5 ?? 14,
            installment6: commissionsMap.installment6 ?? 16.5,
            installment7: commissionsMap.installment7 ?? 19,
            installment8: commissionsMap.installment8 ?? 21.5,
            installment9: commissionsMap.installment9 ?? 24,
            installment10: commissionsMap.installment10 ?? 26.5,
            installment11: commissionsMap.installment11 ?? 29,
            installment12: commissionsMap.installment12 ?? 31.5
          });
        }

        // Load letterhead settings
        if (response.data.letterhead) {
          setLetterhead(response.data.letterhead);
          if (response.data.letterhead.imageUrl) {
            setLetterheadPreview(response.data.letterhead.imageUrl);
          }
        }
      }
    } catch (error) {
      // 404 is normal for new institutions - settings will be created on first save
      if (error.response?.status !== 404) {
        console.error('Error loading settings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Convert cardCommissions to creditCardRates format for backend
      const creditCardRates = [
        { installments: 1, rate: parseFloat(cardCommissions.single) || 0 },
        { installments: 2, rate: parseFloat(cardCommissions.installment2) || 0 },
        { installments: 3, rate: parseFloat(cardCommissions.installment3) || 0 },
        { installments: 4, rate: parseFloat(cardCommissions.installment4) || 0 },
        { installments: 5, rate: parseFloat(cardCommissions.installment5) || 0 },
        { installments: 6, rate: parseFloat(cardCommissions.installment6) || 0 },
        { installments: 7, rate: parseFloat(cardCommissions.installment7) || 0 },
        { installments: 8, rate: parseFloat(cardCommissions.installment8) || 0 },
        { installments: 9, rate: parseFloat(cardCommissions.installment9) || 0 },
        { installments: 10, rate: parseFloat(cardCommissions.installment10) || 0 },
        { installments: 11, rate: parseFloat(cardCommissions.installment11) || 0 },
        { installments: 12, rate: parseFloat(cardCommissions.installment12) || 0 }
      ];

      const settingsData = {
        institution: institution._id,
        vatRate: parseFloat(formData.vatRate),
        creditCardRates: creditCardRates,
        createdBy: currentUser?.username,
        updatedBy: currentUser?.username,
      };

      await api.post('/settings', settingsData);
      setSuccess('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Letterhead handlers
  const handleLetterheadFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLetterheadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLetterheadPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLetterhead = async () => {
    if (!letterheadFile && !letterhead.imageUrl) {
      setError('Lütfen bir antetli kağıt görseli seçin');
      return;
    }

    setLetterheadUploading(true);
    setError('');

    try {
      const formData = new FormData();
      if (letterheadFile) {
        formData.append('letterhead', letterheadFile);
      }
      formData.append('topMargin', letterhead.topMargin);
      formData.append('bottomMargin', letterhead.bottomMargin);
      formData.append('sideMargin', letterhead.sideMargin);
      formData.append('updatedBy', currentUser?.username);

      await api.post(`/settings/letterhead/${institution._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Antetli kağıt başarıyla kaydedildi');
      setLetterheadFile(null);
      loadSettings();
    } catch (error) {
      setError(error.response?.data?.message || 'Antetli kağıt yüklenirken hata oluştu');
    } finally {
      setLetterheadUploading(false);
    }
  };

  const handleDeleteLetterhead = async () => {
    if (!window.confirm('Antetli kağıdı silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await api.delete(`/settings/letterhead/${institution._id}`, {
        data: { updatedBy: currentUser?.username }
      });
      setLetterhead({ imageUrl: null, topMargin: 120, bottomMargin: 60, sideMargin: 40 });
      setLetterheadPreview(null);
      setLetterheadFile(null);
      setSuccess('Antetli kağıt silindi');
    } catch (error) {
      setError(error.response?.data?.message || 'Silme hatası');
    }
  };

  // Load institutions and users for reset dialog
  const loadResetDialogData = async () => {
    try {
      const [institutionsRes, usersRes] = await Promise.all([
        api.get('/institutions'),
        api.get('/users')
      ]);
      setAllInstitutions(institutionsRes.data || []);
      setAllUsers((usersRes.data || []).filter(u => u.role !== 'superadmin'));
    } catch (error) {
      console.error('Error loading reset dialog data:', error);
    }
  };

  const handleOpenResetDialog = () => {
    loadResetDialogData();
    setResetDialog({
      ...resetDialog,
      open: true,
      step: 0,
      error: '',
      selectedInstitution: '',
      dataTypes: {
        students: true,
        courses: true,
        enrollments: true,
        scheduledLessons: true,
        attendance: true,
        trialLessons: true,
        paymentPlans: true,
        payments: true,
        expenses: true,
        cashRegisters: true,
        instructors: true,
        activityLogs: true,
        settings: true,
      },
      deleteSeasons: false,
      deleteInstitutions: false,
      deleteUsers: false,
      usersToDelete: [],
    });
  };

  const handleResetNext = () => {
    setResetDialog({ ...resetDialog, step: resetDialog.step + 1, error: '' });
  };

  const handleResetBack = () => {
    setResetDialog({ ...resetDialog, step: resetDialog.step - 1, error: '' });
  };

  const handleResetDatabase = async () => {
    // Verify and reset
    if (!resetDialog.username || !resetDialog.password) {
      setResetDialog({ ...resetDialog, error: 'Kullanıcı adı ve şifre gerekli' });
      return;
    }

    try {
      setResetDialog({ ...resetDialog, processing: true, error: '' });

      // Collect selected data types
      const selectedDataTypes = Object.entries(resetDialog.dataTypes)
        .filter(([_, selected]) => selected)
        .map(([type, _]) => type);

      const response = await api.post('/settings/reset-database', {
        username: resetDialog.username,
        password: resetDialog.password,
        institutionId: resetDialog.selectedInstitution || null,
        dataTypes: selectedDataTypes.length > 0 ? selectedDataTypes : null,
        deleteSeasons: resetDialog.deleteSeasons,
        deleteInstitutions: resetDialog.deleteInstitutions,
        deleteUsers: resetDialog.deleteUsers,
        usersToDelete: resetDialog.deleteUsers ? resetDialog.usersToDelete : null,
      });

      // Show deleted counts
      const counts = response.data.deletedCounts || {};
      const summary = Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `${type}: ${count}`)
        .join('\n');

      alert(`✅ Veriler başarıyla silindi!\n\nSilinen kayıtlar:\n${summary || 'Hiçbir kayıt silinmedi'}`);

      // Reset dialog state
      setResetDialog({
        open: false,
        step: 0,
        username: '',
        password: '',
        error: '',
        processing: false,
        selectedInstitution: '',
        dataTypes: {
          students: true, courses: true, enrollments: true, scheduledLessons: true,
          attendance: true, trialLessons: true, paymentPlans: true, payments: true,
          expenses: true, cashRegisters: true, instructors: true, activityLogs: true, settings: true,
        },
        deleteSeasons: false,
        deleteInstitutions: false,
        deleteUsers: false,
        usersToDelete: [],
      });

      // If deleted all institutions or the current one, redirect to login
      if (resetDialog.deleteInstitutions && (!resetDialog.selectedInstitution || resetDialog.selectedInstitution === institution?._id)) {
        localStorage.clear();
        navigate('/login');
      }

    } catch (error) {
      setResetDialog({
        ...resetDialog,
        processing: false,
        error: error.response?.data?.message || 'Bir hata oluştu'
      });
    }
  };

  const handleCloseResetDialog = () => {
    setResetDialog({
      open: false,
      step: 0,
      username: '',
      password: '',
      error: '',
      processing: false,
      selectedInstitution: '',
      dataTypes: {
        students: true, courses: true, enrollments: true, scheduledLessons: true,
        attendance: true, trialLessons: true, paymentPlans: true, payments: true,
        expenses: true, cashRegisters: true, instructors: true, activityLogs: true, settings: true,
      },
      deleteSeasons: false,
      deleteInstitutions: false,
      deleteUsers: false,
      usersToDelete: [],
    });
  };

  const toggleDataType = (type) => {
    setResetDialog({
      ...resetDialog,
      dataTypes: {
        ...resetDialog.dataTypes,
        [type]: !resetDialog.dataTypes[type]
      }
    });
  };

  const toggleUserSelection = (userId) => {
    const newSelection = resetDialog.usersToDelete.includes(userId)
      ? resetDialog.usersToDelete.filter(id => id !== userId)
      : [...resetDialog.usersToDelete, userId];
    setResetDialog({ ...resetDialog, usersToDelete: newSelection });
  };

  const selectAllUsers = () => {
    const filteredUsers = allUsers.filter(u =>
      !resetDialog.selectedInstitution ||
      (u.institutions && u.institutions.some(inst =>
        (typeof inst === 'object' ? inst._id : inst) === resetDialog.selectedInstitution
      ))
    );
    setResetDialog({
      ...resetDialog,
      usersToDelete: filteredUsers.map(u => u._id)
    });
  };

  const deselectAllUsers = () => {
    setResetDialog({ ...resetDialog, usersToDelete: [] });
  };

  const getDataTypeLabel = (type) => {
    const labels = {
      students: 'Öğrenciler',
      courses: 'Dersler',
      enrollments: 'Ders Kayıtları',
      scheduledLessons: 'Takvim Dersleri',
      attendance: 'Yoklama Kayıtları',
      trialLessons: 'Deneme Dersleri',
      paymentPlans: 'Ödeme Planları',
      payments: 'Ödemeler',
      expenses: 'Giderler',
      cashRegisters: 'Kasalar',
      instructors: 'Eğitmenler',
      activityLogs: 'Aktivite Logları',
      settings: 'Ayarlar',
    };
    return labels[type] || type;
  };

  if (!institution) {
    // If no institution, show a message only for non-superadmin on general settings tab
    if (tabValue === 0 && currentUser?.role !== 'superadmin') {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" color="text.secondary">
            Lütfen bir kurum seçin
          </Typography>
        </Box>
      );
    }
    // For superadmin or other tabs, continue rendering
  }

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2 }}>
            <Tab label="Genel Ayarlar" />
            <Tab label="Kurum Yönetimi" />
            <Tab label="Kurum Ayarları" />
            <Tab label="Sezon Yönetimi" />
          </Tabs>
        </Box>

        {/* Tab 0: Genel Ayarlar (Mevcut Ayarlar) */}
        {tabValue === 0 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              Genel Ayarlar
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Finansal Ayarlar
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="KDV Oranı (%)"
                    name="vatRate"
                    type="number"
                    value={formData.vatRate}
                    onChange={handleChange}
                    inputProps={{ min: 0, max: 100 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Varsayılan Taksit Sayısı"
                    name="defaultInstallments"
                    type="number"
                    value={formData.defaultInstallments}
                    onChange={handleChange}
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Kredi Kartı Komisyon Oranları (%)
              </Typography>

              <Grid container spacing={2}>
                {[
                  { key: 'single', label: 'Tek Çekim' },
                  { key: 'installment2', label: '2 Taksit' },
                  { key: 'installment3', label: '3 Taksit' },
                  { key: 'installment4', label: '4 Taksit' },
                  { key: 'installment5', label: '5 Taksit' },
                  { key: 'installment6', label: '6 Taksit' },
                  { key: 'installment7', label: '7 Taksit' },
                  { key: 'installment8', label: '8 Taksit' },
                  { key: 'installment9', label: '9 Taksit' },
                  { key: 'installment10', label: '10 Taksit' },
                  { key: 'installment11', label: '11 Taksit' },
                  { key: 'installment12', label: '12 Taksit' },
                ].map(({ key, label }) => (
                  <Grid item xs={6} sm={4} md={3} key={key}>
                    <TextField
                      fullWidth
                      size="small"
                      label={label}
                      type="number"
                      value={cardCommissions[key]}
                      onChange={(e) => setCardCommissions({
                        ...cardCommissions,
                        [key]: parseFloat(e.target.value) || 0
                      })}
                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                >
                  {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 4 }} />

            {/* Letterhead Section */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Antetli Kağıt Ayarları
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              PDF çıktılar için antetli kağıt görseli yükleyin. Bu görsel, Son Durum Raporu gibi belgelerin arka planında kullanılacaktır.
            </Typography>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: letterheadPreview ? 'success.main' : 'grey.400',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'grey.50',
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {letterheadPreview ? (
                    <Box sx={{ width: '100%' }}>
                      <img
                        src={letterheadPreview}
                        alt="Antetli Kağıt Önizleme"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 300,
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUpload />}
                        >
                          Değiştir
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleLetterheadFileChange}
                          />
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<Delete />}
                          onClick={handleDeleteLetterhead}
                        >
                          Sil
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <ImageIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Antetli kağıt görseli yükleyin
                      </Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        PNG, JPG veya PDF formatında, max 5MB
                      </Typography>
                      <Button
                        variant="contained"
                        component="label"
                        startIcon={<CloudUpload />}
                        sx={{ mt: 2 }}
                      >
                        Görsel Seç
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleLetterheadFileChange}
                        />
                      </Button>
                    </>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Kenar Boşlukları (piksel)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Antetli kağıdınıza göre kenar boşluklarını ayarlayın
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Üst Boşluk (Antet Alanı)"
                      type="number"
                      value={letterhead.topMargin}
                      onChange={(e) => setLetterhead({ ...letterhead, topMargin: parseInt(e.target.value) || 0 })}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      }}
                      helperText="Antet bölgesi için üstten bırakılacak boşluk"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Yan Boşluk"
                      type="number"
                      value={letterhead.sideMargin}
                      onChange={(e) => setLetterhead({ ...letterhead, sideMargin: parseInt(e.target.value) || 0 })}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Alt Boşluk"
                      type="number"
                      value={letterhead.bottomMargin}
                      onChange={(e) => setLetterhead({ ...letterhead, bottomMargin: parseInt(e.target.value) || 0 })}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">px</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUploadLetterhead}
                  disabled={letterheadUploading || (!letterheadFile && !letterhead.imageUrl)}
                  startIcon={letterheadUploading ? null : <CloudUpload />}
                  sx={{ mt: 3 }}
                >
                  {letterheadUploading ? 'Kaydediliyor...' : 'Antetli Kağıdı Kaydet'}
                </Button>
              </Grid>
            </Grid>

            <Divider sx={{ my: 6 }} />

            {/* Danger Zone - Database Reset */}
            {currentUser?.role === 'superadmin' && (
              <Box sx={{ p: 3, border: '2px solid', borderColor: 'error.main', borderRadius: 2, bgcolor: 'error.lighter' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <WarningIcon color="error" />
                  <Typography variant="h6" color="error">
                    Tehlikeli Bölge
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Bu bölümdeki işlemler geri alınamaz. Dikkatli olun!
                </Typography>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Veritabanını Sıfırla
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Seçtiğiniz kurum ve veri türlerine göre sistemdeki verileri silebilirsiniz.
                    Kurum seçimi, veri türü seçimi ve kullanıcı silme seçenekleri mevcuttur.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleOpenResetDialog}
                    startIcon={<WarningIcon />}
                  >
                    Veritabanını Sıfırla
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Tab 1: Kurum Yönetimi */}
        {tabValue === 1 && (
          <Box sx={{ p: 4 }}>
            <Institutions />
          </Box>
        )}

        {/* Tab 2: Kurum Ayarları */}
        {tabValue === 2 && (
          <Box sx={{ p: 4 }}>
            <InstitutionSetup />
          </Box>
        )}

        {/* Tab 3: Sezon Yönetimi */}
        {tabValue === 3 && (
          <Box sx={{ p: 4 }}>
            <SeasonManagement />
          </Box>
        )}
      </Paper>

      {/* Database Reset Dialog - Multi-step */}
      <Dialog
        open={resetDialog.open}
        onClose={handleCloseResetDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            <span>Veritabanını Sıfırla</span>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {/* Stepper */}
          <Stepper activeStep={resetDialog.step} sx={{ mb: 3 }}>
            <Step><StepLabel>Kurum Seçimi</StepLabel></Step>
            <Step><StepLabel>Veri Türleri</StepLabel></Step>
            <Step><StepLabel>Kullanıcılar</StepLabel></Step>
            <Step><StepLabel>Onay</StepLabel></Step>
          </Stepper>

          {resetDialog.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetDialog.error}
            </Alert>
          )}

          {/* Step 0: Select Institution */}
          {resetDialog.step === 0 && (
            <>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Hangi kurumun verilerini silmek istediğinizi seçin.
                "Tüm Kurumlar" seçerseniz sistemdeki tüm veriler etkilenir.
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Kurum Seçin</InputLabel>
                <Select
                  value={resetDialog.selectedInstitution}
                  onChange={(e) => setResetDialog({ ...resetDialog, selectedInstitution: e.target.value })}
                  label="Kurum Seçin"
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Business color="error" />
                      <strong>TÜM KURUMLAR</strong>
                    </Box>
                  </MenuItem>
                  {allInstitutions.map((inst) => (
                    <MenuItem key={inst._id} value={inst._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <School color="primary" />
                        {inst.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!resetDialog.selectedInstitution && (
                <Alert severity="error">
                  "Tüm Kurumlar" seçildi. Bu seçim, <strong>sistemdeki tüm kurumların verilerini</strong> etkileyecektir!
                </Alert>
              )}
            </>
          )}

          {/* Step 1: Select Data Types */}
          {resetDialog.step === 1 && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Silmek istediğiniz veri türlerini seçin:
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Öğrenci & Ders Verileri</Typography>
                  <FormGroup>
                    {['students', 'courses', 'enrollments', 'trialLessons'].map(type => (
                      <FormControlLabel
                        key={type}
                        control={
                          <Checkbox
                            checked={resetDialog.dataTypes[type]}
                            onChange={() => toggleDataType(type)}
                          />
                        }
                        label={getDataTypeLabel(type)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Takvim & Yoklama</Typography>
                  <FormGroup>
                    {['scheduledLessons', 'attendance'].map(type => (
                      <FormControlLabel
                        key={type}
                        control={
                          <Checkbox
                            checked={resetDialog.dataTypes[type]}
                            onChange={() => toggleDataType(type)}
                          />
                        }
                        label={getDataTypeLabel(type)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Finansal Veriler</Typography>
                  <FormGroup>
                    {['paymentPlans', 'payments', 'expenses', 'cashRegisters'].map(type => (
                      <FormControlLabel
                        key={type}
                        control={
                          <Checkbox
                            checked={resetDialog.dataTypes[type]}
                            onChange={() => toggleDataType(type)}
                          />
                        }
                        label={getDataTypeLabel(type)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Diğer</Typography>
                  <FormGroup>
                    {['instructors', 'activityLogs', 'settings'].map(type => (
                      <FormControlLabel
                        key={type}
                        control={
                          <Checkbox
                            checked={resetDialog.dataTypes[type]}
                            onChange={() => toggleDataType(type)}
                          />
                        }
                        label={getDataTypeLabel(type)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Dikkat: Kurum & Sezon Silme
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={resetDialog.deleteSeasons}
                          onChange={(e) => setResetDialog({ ...resetDialog, deleteSeasons: e.target.checked })}
                          color="error"
                        />
                      }
                      label="Sezonları Sil"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={resetDialog.deleteInstitutions}
                          onChange={(e) => setResetDialog({ ...resetDialog, deleteInstitutions: e.target.checked })}
                          color="error"
                        />
                      }
                      label={resetDialog.selectedInstitution ? "Bu Kurumu Sil" : "Tüm Kurumları Sil"}
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </>
          )}

          {/* Step 2: Select Users */}
          {resetDialog.step === 2 && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={resetDialog.deleteUsers}
                    onChange={(e) => setResetDialog({ ...resetDialog, deleteUsers: e.target.checked, usersToDelete: [] })}
                    color="error"
                  />
                }
                label="Kullanıcıları Sil"
              />

              {resetDialog.deleteUsers && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Süperadmin kullanıcıları asla silinemez. Silmek istediğiniz kullanıcıları seçin:
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button size="small" variant="outlined" onClick={selectAllUsers}>
                      Tümünü Seç
                    </Button>
                    <Button size="small" variant="outlined" onClick={deselectAllUsers}>
                      Seçimi Temizle
                    </Button>
                    <Chip
                      label={`${resetDialog.usersToDelete.length} kullanıcı seçildi`}
                      color={resetDialog.usersToDelete.length > 0 ? 'error' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <List dense>
                      {allUsers
                        .filter(u =>
                          !resetDialog.selectedInstitution ||
                          (u.institutions && u.institutions.some(inst =>
                            (typeof inst === 'object' ? inst._id : inst) === resetDialog.selectedInstitution
                          ))
                        )
                        .map((u) => (
                          <ListItem
                            key={u._id}
                            button
                            onClick={() => toggleUserSelection(u._id)}
                            selected={resetDialog.usersToDelete.includes(u._id)}
                          >
                            <ListItemIcon>
                              <Checkbox
                                edge="start"
                                checked={resetDialog.usersToDelete.includes(u._id)}
                                tabIndex={-1}
                                disableRipple
                                color="error"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${u.firstName || ''} ${u.lastName || ''} (${u.username})`}
                              secondary={`Rol: ${u.role}`}
                            />
                          </ListItem>
                        ))}
                      {allUsers.filter(u =>
                        !resetDialog.selectedInstitution ||
                        (u.institutions && u.institutions.some(inst =>
                          (typeof inst === 'object' ? inst._id : inst) === resetDialog.selectedInstitution
                        ))
                      ).length === 0 && (
                        <ListItem>
                          <ListItemText secondary="Bu kurumda silinebilecek kullanıcı yok" />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                </Box>
              )}

              {!resetDialog.deleteUsers && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Kullanıcılar silinmeyecek.
                </Alert>
              )}
            </>
          )}

          {/* Step 3: Confirm and Password */}
          {resetDialog.step === 3 && (
            <>
              <Alert severity="error" sx={{ mb: 3 }}>
                <strong>⚠️ UYARI: Bu işlem geri alınamaz!</strong>
              </Alert>

              <Typography variant="subtitle1" gutterBottom>Silinecek Veriler Özeti:</Typography>

              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 3 }}>
                <Typography variant="body2">
                  <strong>Kurum:</strong> {resetDialog.selectedInstitution
                    ? allInstitutions.find(i => i._id === resetDialog.selectedInstitution)?.name
                    : 'TÜM KURUMLAR'}
                </Typography>

                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Silinecek Veri Türleri:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {Object.entries(resetDialog.dataTypes)
                    .filter(([_, selected]) => selected)
                    .map(([type, _]) => (
                      <Chip key={type} label={getDataTypeLabel(type)} size="small" color="error" variant="outlined" />
                    ))}
                </Box>

                {resetDialog.deleteSeasons && (
                  <Chip label="Sezonlar" size="small" color="error" sx={{ mt: 1, mr: 0.5 }} />
                )}
                {resetDialog.deleteInstitutions && (
                  <Chip label={resetDialog.selectedInstitution ? "Bu Kurum" : "Tüm Kurumlar"} size="small" color="error" sx={{ mt: 1 }} />
                )}

                {resetDialog.deleteUsers && resetDialog.usersToDelete.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Silinecek Kullanıcılar:</strong> {resetDialog.usersToDelete.length} kullanıcı
                  </Typography>
                )}
              </Box>

              <DialogContentText sx={{ mb: 2 }}>
                Devam etmek için <strong>süperadmin</strong> kullanıcı adı ve şifrenizi girin:
              </DialogContentText>
              <TextField
                autoFocus
                fullWidth
                label="Kullanıcı Adı"
                value={resetDialog.username}
                onChange={(e) => setResetDialog({ ...resetDialog, username: e.target.value })}
                sx={{ mb: 2 }}
                disabled={resetDialog.processing}
              />
              <TextField
                fullWidth
                label="Şifre"
                type="password"
                value={resetDialog.password}
                onChange={(e) => setResetDialog({ ...resetDialog, password: e.target.value })}
                disabled={resetDialog.processing}
              />
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseResetDialog} disabled={resetDialog.processing}>
            İptal
          </Button>
          {resetDialog.step > 0 && (
            <Button onClick={handleResetBack} disabled={resetDialog.processing}>
              Geri
            </Button>
          )}
          {resetDialog.step < 3 ? (
            <Button
              onClick={handleResetNext}
              variant="contained"
              color="primary"
            >
              İleri
            </Button>
          ) : (
            <Button
              onClick={handleResetDatabase}
              variant="contained"
              color="error"
              disabled={resetDialog.processing || !resetDialog.username || !resetDialog.password}
              startIcon={<Delete />}
            >
              {resetDialog.processing ? 'Siliniyor...' : 'VERİLERİ SİL'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;
