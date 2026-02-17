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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  FormGroup,
  Alert,
  Checkbox,
  ListItemText
} from '@mui/material';
import { Add, Edit, Delete, DeleteForever, Visibility, School } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';

const Users = () => {
  const { institution, user: currentUser } = useApp();
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openActivitiesDialog, setOpenActivitiesDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, permanent: false });
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  const defaultPermissions = {
    canViewCalendar: true,
    canMarkAttendance: true,
    canManageScheduledLessons: true,
    canManageStudents: true,
    canManageTrialLessons: true,
    canManageCourses: true,
    canManageInstructors: true,
    canManagePayments: true,
    canCreatePaymentPlans: true,
    canCollectPayments: true,
    canManageExpenses: true,
    canCreateExpenses: true,
    canViewCashRegisters: true,
    canManageCashRegisters: true,
    canViewReports: true,
    canViewDashboardFinancials: true,
    canViewPaymentAmounts: true,
    canManageSettings: false,
    canManageUsers: false,
    canManageInstitutions: false,
    canViewActivityLogs: false
  };

  const staffPermissions = {
    canViewCalendar: true,
    canMarkAttendance: true,
    canManageScheduledLessons: true,
    canManageStudents: true,
    canManageTrialLessons: true,
    canManageCourses: false,
    canManageInstructors: false,
    canManagePayments: false,
    canCreatePaymentPlans: true,
    canCollectPayments: true,
    canManageExpenses: false,
    canCreateExpenses: true,
    canViewCashRegisters: false,
    canManageCashRegisters: false,
    canViewReports: false,
    canViewDashboardFinancials: false,
    canViewPaymentAmounts: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageInstitutions: false,
    canViewActivityLogs: false
  };

  const instructorPermissions = {
    canViewCalendar: true,
    canMarkAttendance: true,
    canManageScheduledLessons: false,
    canManageStudents: false,
    canManageTrialLessons: false,
    canManageCourses: false,
    canManageInstructors: false,
    canManagePayments: false,
    canCreatePaymentPlans: false,
    canCollectPayments: false,
    canManageExpenses: false,
    canCreateExpenses: false,
    canViewCashRegisters: false,
    canManageCashRegisters: false,
    canViewReports: false,
    canViewDashboardFinancials: false,
    canViewPaymentAmounts: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageInstitutions: false,
    canViewActivityLogs: false
  };

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    institutions: [],
    permissions: { ...defaultPermissions },
    avatarColor: '#1976d2',
    isActive: true
  });

  useEffect(() => {
    loadUsers();
    loadInstitutions();
  }, [institution, currentUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Superadmin sees all users, others see only their institution's users
      const params = {};
      if (institution?._id && currentUser?.role !== 'superadmin') {
        params.institutionId = institution._id;
      }
      const response = await api.get('/users', { params });
      setUsers(response.data);
    } catch (error) {
      showAlert('Kullanıcılar yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutions = async () => {
    try {
      const response = await api.get('/institutions');
      setInstitutions(response.data);
    } catch (error) {
      console.error('Error loading institutions:', error);
    }
  };

  const showAlert = (message, severity = 'success') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'success' }), 3000);
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      // Handle institutions that might be ObjectId objects or strings
      const userInstitutions = (user.institutions || []).map(inst =>
        typeof inst === 'object' ? inst._id : inst
      );
      setFormData({
        username: user.username,
        fullName: user.fullName,
        email: user.email || '',
        phone: user.phone || '',
        password: '',
        role: user.role,
        institutions: userInstitutions,
        permissions: {
          ...defaultPermissions,
          ...user.permissions
        },
        avatarColor: user.avatarColor || '#1976d2',
        isActive: user.isActive !== false
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'staff',
        institutions: institution?._id ? [institution._id] : [],
        permissions: { ...defaultPermissions },
        avatarColor: '#1976d2',
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const userData = {
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        institutions: formData.role === 'superadmin' ? [] : formData.institutions,
        permissions: formData.permissions,
        avatarColor: formData.avatarColor,
        isActive: formData.isActive,
        institution: institution?._id || null,
        [selectedUser ? 'updatedBy' : 'createdBy']: currentUser?.username
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      if (selectedUser) {
        await api.put(`/users/${selectedUser._id}`, userData);
        showAlert('Kullanıcı güncellendi');
      } else {
        await api.post('/users', userData);
        showAlert('Kullanıcı oluşturuldu');
      }

      await loadUsers();
      handleCloseDialog();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (confirmDialog.permanent) {
        await api.delete(`/users/${confirmDialog.user._id}/permanent`, {
          data: { deletedBy: currentUser?.username }
        });
        showAlert('Kullanıcı kalıcı olarak silindi');
      } else {
        await api.delete(`/users/${confirmDialog.user._id}`, {
          data: { deletedBy: currentUser?.username }
        });
        showAlert('Kullanıcı pasif edildi');
      }
      loadUsers();
      setConfirmDialog({ open: false, user: null, permanent: false });
    } catch (error) {
      showAlert(error.response?.data?.message || 'Kullanıcı silinirken hata oluştu', 'error');
    }
  };

  const handleViewActivities = async (user) => {
    try {
      const response = await api.get(`/users/${user._id}/activities`);
      setUserActivities(response.data);
      setSelectedUser(user);
      setOpenActivitiesDialog(true);
    } catch (error) {
      showAlert('Aktiviteler yüklenirken hata oluştu', 'error');
    }
  };

  const getRoleName = (role) => {
    const roles = {
      superadmin: 'Süper Admin',
      admin: 'Yönetici',
      manager: 'Müdür',
      accountant: 'Muhasebe',
      instructor: 'Eğitmen',
      staff: 'Personel'
    };
    return roles[role] || role;
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return <LoadingSpinner message="Kullanıcılar yükleniyor..." />;
  }

  return (
    <Box>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }}>
          {alert.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Kullanıcılar</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Kullanıcı
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>Kullanıcı Adı</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: user.avatarColor }}>
                      {getInitials(user.fullName)}
                    </Avatar>
                    <Typography>{user.fullName}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Chip label={getRoleName(user.role)} size="small" />
                </TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Aktif' : 'Pasif'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleViewActivities(user)}
                    title="Aktiviteleri Görüntüle"
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                    title="Düzenle"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setConfirmDialog({ open: true, user, permanent: false })}
                    title="Pasif Et"
                  >
                    <Delete />
                  </IconButton>
                  {user.role !== 'superadmin' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmDialog({ open: true, user, permanent: true })}
                      title="Kalıcı Olarak Sil"
                    >
                      <DeleteForever />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* User Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Kullanıcı Adı"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              fullWidth
            />
            <TextField
              fullWidth
              label="Şifre"
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!selectedUser}
              helperText={selectedUser ? "Boş bırakırsanız şifre değişmez" : ""}
            />
            <TextField
              label="Ad Soyad"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Telefon"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                value={formData.role}
                label="Rol"
                onChange={(e) => {
                  const newRole = e.target.value;
                  if (newRole === 'instructor') {
                    setFormData({
                      ...formData,
                      role: newRole,
                      permissions: { ...instructorPermissions }
                    });
                  } else if (newRole === 'staff') {
                    setFormData({
                      ...formData,
                      role: newRole,
                      permissions: { ...staffPermissions }
                    });
                  } else if (newRole === 'admin') {
                    setFormData({
                      ...formData,
                      role: newRole,
                      permissions: { ...defaultPermissions, canManageSettings: true, canManageUsers: true, canManageInstitutions: true, canViewActivityLogs: true }
                    });
                  } else {
                    setFormData({ ...formData, role: newRole });
                  }
                }}
              >
                <MenuItem value="admin">Yönetici (Tüm yetkiler)</MenuItem>
                <MenuItem value="manager">Müdür</MenuItem>
                <MenuItem value="accountant">Muhasebe</MenuItem>
                <MenuItem value="instructor">Eğitmen (Sadece takvim ve yoklama)</MenuItem>
                <MenuItem value="staff">Personel</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Not: Rol seçimi yetkiler üzerinde etkili değildir. Yetkileri aşağıdan ayarlayın.
            </Typography>

            {/* Active/Passive Status - Only when editing */}
            {selectedUser && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    color="success"
                  />
                }
                label={formData.isActive ? "Aktif Kullanıcı" : "Pasif Kullanıcı"}
              />
            )}

            {/* Institutions Selection - Only for non-superadmin */}
            {formData.role !== 'superadmin' && (
              <FormControl fullWidth margin="normal">
                <InputLabel id="institutions-label">Erişebileceği Kurumlar</InputLabel>
                <Select
                  labelId="institutions-label"
                  multiple
                  value={formData.institutions}
                  onChange={(e) => setFormData({ ...formData, institutions: e.target.value })}
                  label="Erişebileceği Kurumlar"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((instId) => {
                        const inst = institutions.find(i => i._id === instId);
                        return (
                          <Chip key={instId} label={inst?.name || instId} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {institutions.map((inst) => (
                    <MenuItem key={inst._id} value={inst._id}>
                      <Checkbox checked={formData.institutions.includes(inst._id)} />
                      <ListItemText primary={inst.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {formData.role === 'superadmin' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Superadmin tüm kurumlara erişebilir, kurum seçimi gerekmez.
              </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle2">Yetkiler:</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<School />}
                  onClick={() => setFormData({
                    ...formData,
                    permissions: { ...instructorPermissions }
                  })}
                >
                  Eğitmen Profili
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  onClick={() => setFormData({
                    ...formData,
                    permissions: { ...staffPermissions }
                  })}
                >
                  Personel Profili
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => setFormData({
                    ...formData,
                    permissions: { ...defaultPermissions, canManageSettings: true, canManageUsers: true, canManageInstitutions: true, canViewActivityLogs: true }
                  })}
                >
                  Tam Yetki
                </Button>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Eğitmen: Sadece takvim ve yoklama. Personel: Öğrenci kaydı, tahsilat, gider girişi, takvim (mali veriler gizli). Tam Yetki: Her şeye erişim.
            </Typography>
            <FormGroup>
              {/* Takvim & Ders İşlemleri */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                <Typography variant="caption" color="success.main" fontWeight="bold">
                  Takvim & Ders İşlemleri
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canViewCalendar} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canViewCalendar: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Takvimi Görüntüle</Typography><Typography variant="caption" color="text.secondary">Ders takvimini ve programı görüntüleyebilir</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canMarkAttendance} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canMarkAttendance: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Yoklama Al</Typography><Typography variant="caption" color="text.secondary">Dersleri tamamlandı olarak işaretleyebilir ve yoklama alabilir</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageScheduledLessons} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageScheduledLessons: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Ders Ekleme/Çıkarma</Typography><Typography variant="caption" color="text.secondary">Takvimde ders oluşturma, düzenleme ve silme</Typography></Box>}
                />
              </Box>

              {/* Öğrenci İşlemleri */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Öğrenci İşlemleri
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageStudents} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageStudents: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Öğrenci Yönetimi</Typography><Typography variant="caption" color="text.secondary">Öğrenci ekleme, düzenleme, kayıt ve detay görüntüleme</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageTrialLessons} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageTrialLessons: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Deneme Dersi Yönetimi</Typography><Typography variant="caption" color="text.secondary">Deneme dersi kaydı oluşturma, düzenleme ve kesin kayıt yapma</Typography></Box>}
                />
              </Box>

              {/* Ders & Eğitmen Yönetimi */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  Ders & Eğitmen Yönetimi
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageCourses} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageCourses: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Ders Yönetimi</Typography><Typography variant="caption" color="text.secondary">Ders oluşturma, düzenleme ve silme</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageInstructors} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageInstructors: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Eğitmen Yönetimi</Typography><Typography variant="caption" color="text.secondary">Eğitmen ekleme, düzenleme ve maaş bilgileri</Typography></Box>}
                />
              </Box>

              {/* Tahsilat & Ödeme İşlemleri */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="caption" color="info.main" fontWeight="bold">
                  Tahsilat & Ödeme İşlemleri
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManagePayments} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManagePayments: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Ödemeler Sayfası</Typography><Typography variant="caption" color="text.secondary">Ödemeler sayfasını görüntüleme ve ödeme geçmişini inceleme</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canCreatePaymentPlans} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canCreatePaymentPlans: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Ödeme Planı Oluştur</Typography><Typography variant="caption" color="text.secondary">Öğrenci detayında ödeme planı oluşturma ve düzenleme</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canCollectPayments} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canCollectPayments: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Tahsilat Yap</Typography><Typography variant="caption" color="text.secondary">Taksit ödemesi alma ve ödeme işleme</Typography></Box>}
                />
              </Box>

              {/* Gider İşlemleri */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="caption" color="info.main" fontWeight="bold">
                  Gider İşlemleri
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageExpenses} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageExpenses: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Giderler Sayfası</Typography><Typography variant="caption" color="text.secondary">Giderler sayfasını görüntüleme ve gider geçmişini inceleme</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canCreateExpenses} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canCreateExpenses: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Gider Girişi Yap</Typography><Typography variant="caption" color="text.secondary">Yeni gider/harcama kaydı oluşturma</Typography></Box>}
                />
              </Box>

              {/* Mali Görünürlük */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="caption" color="warning.main" fontWeight="bold">
                  Mali Görünürlük (Hassas)
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canViewDashboardFinancials} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canViewDashboardFinancials: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Panel Mali Verileri</Typography><Typography variant="caption" color="text.secondary">Ana paneldeki gelir, gider, net kâr ve kasa bakiye rakamlarını görebilir</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canViewCashRegisters} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canViewCashRegisters: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Kasaları Görüntüle</Typography><Typography variant="caption" color="text.secondary">Kasa Yönetimi sayfasını ve kasa bakiyelerini görebilir</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageCashRegisters} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageCashRegisters: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Kasa Yönetimi</Typography><Typography variant="caption" color="text.secondary">Kasa oluşturma, düzenleme, virman ve bakiye ayarlama</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canViewReports} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canViewReports: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Raporlar</Typography><Typography variant="caption" color="text.secondary">Mali raporlar, gelir-gider özeti ve istatistikler</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canViewPaymentAmounts} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canViewPaymentAmounts: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Ödeme Tutarlarını Gör</Typography><Typography variant="caption" color="text.secondary">Öğrenci detaylarında ödeme planı tutarlarını ve bakiye bilgilerini görebilir</Typography></Box>}
                />
              </Box>

              {/* Sistem Yönetimi */}
              <Box sx={{ mb: 1, p: 1, bgcolor: 'error.50', borderRadius: 1 }}>
                <Typography variant="caption" color="error.main" fontWeight="bold">
                  Sistem Yetkileri (Sadece Yöneticiler)
                </Typography>
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageSettings} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageSettings: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Ayarları Yönet</Typography><Typography variant="caption" color="text.secondary">Kurum ayarları, sezon yönetimi ve sistem yapılandırması</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canManageUsers} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canManageUsers: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Kullanıcı Yönetimi</Typography><Typography variant="caption" color="text.secondary">Kullanıcı ekleme, düzenleme, silme ve yetki atama</Typography></Box>}
                />
                <FormControlLabel
                  control={<Switch checked={formData.permissions.canViewActivityLogs} onChange={(e) => setFormData({ ...formData, permissions: { ...formData.permissions, canViewActivityLogs: e.target.checked } })} />}
                  label={<Box><Typography variant="body2">Aktivite Logları</Typography><Typography variant="caption" color="text.secondary">Tüm kullanıcı aktivite loglarını görüntüleme</Typography></Box>}
                />
              </Box>
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedUser ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Activities Dialog */}
      <Dialog
        open={openActivitiesDialog}
        onClose={() => setOpenActivitiesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedUser?.fullName} - Aktiviteler
        </DialogTitle>
        <DialogContent>
          {userActivities.length === 0 ? (
            <Typography color="text.secondary">Henüz aktivite yok</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {userActivities.map((activity) => (
                <Paper key={activity._id} sx={{ p: 2 }}>
                  <Typography variant="body2" color="primary">
                    {activity.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.createdAt).toLocaleString('tr-TR')}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenActivitiesDialog(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.permanent ? "Kullanıcıyı Kalıcı Olarak Sil" : "Kullanıcıyı Pasif Et"}
        message={confirmDialog.permanent
          ? `${confirmDialog.user?.fullName} kullanıcısını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`
          : `${confirmDialog.user?.fullName} kullanıcısını pasif etmek istediğinizden emin misiniz?`
        }
        onConfirm={handleDelete}
        onClose={() => setConfirmDialog({ open: false, user: null, permanent: false })}
        confirmColor={confirmDialog.permanent ? "error" : "primary"}
      />
    </Box>
  );
};

export default Users;
