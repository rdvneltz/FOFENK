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
import { Add, Edit, Delete, DeleteForever, Visibility } from '@mui/icons-material';
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

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    institutions: [],
    permissions: {
      canManageStudents: true,
      canManageCourses: true,
      canManagePayments: true,
      canManageExpenses: true,
      canManageInstructors: true,
      canViewReports: true,
      canManageSettings: false,
      canManageUsers: false
    },
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
        permissions: user.permissions || {
          canManageStudents: true,
          canManageCourses: true,
          canManagePayments: true,
          canManageExpenses: true,
          canManageInstructors: true,
          canViewReports: true,
          canManageSettings: false,
          canManageUsers: false
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
        permissions: {
          canManageStudents: true,
          canManageCourses: true,
          canManagePayments: true,
          canManageExpenses: true,
          canManageInstructors: true,
          canViewReports: true,
          canManageSettings: false,
          canManageUsers: false
        },
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
      admin: 'Yönetici',
      manager: 'Müdür',
      accountant: 'Muhasebe',
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
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="admin">Yönetici</MenuItem>
                <MenuItem value="manager">Müdür</MenuItem>
                <MenuItem value="accountant">Muhasebe</MenuItem>
                <MenuItem value="staff">Personel</MenuItem>
              </Select>
            </FormControl>

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

            <Typography variant="subtitle2" sx={{ mt: 2 }}>Yetkiler:</Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canManageStudents}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageStudents: e.target.checked }
                    })}
                  />
                }
                label="Öğrenci Yönetimi"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canManageCourses}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageCourses: e.target.checked }
                    })}
                  />
                }
                label="Ders Yönetimi"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canManagePayments}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManagePayments: e.target.checked }
                    })}
                  />
                }
                label="Ödeme Yönetimi"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canManageExpenses}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageExpenses: e.target.checked }
                    })}
                  />
                }
                label="Gider Yönetimi"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canViewReports}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canViewReports: e.target.checked }
                    })}
                  />
                }
                label="Raporları Görüntüleme"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canManageSettings}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageSettings: e.target.checked }
                    })}
                  />
                }
                label="Ayarları Yönetme"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permissions.canManageUsers}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, canManageUsers: e.target.checked }
                    })}
                  />
                }
                label="Kullanıcı Yönetimi"
              />
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
