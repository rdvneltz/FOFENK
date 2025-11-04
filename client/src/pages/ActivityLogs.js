import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  TablePagination
} from '@mui/material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const ActivityLogs = () => {
  const { institution, users } = useApp();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    entity: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    if (institution) {
      loadActivities();
    }
  }, [institution, filters, page, rowsPerPage]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/activity-logs', {
        params: {
          institutionId: institution._id,
          ...filters,
          skip: page * rowsPerPage,
          limit: rowsPerPage
        }
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      create: 'success',
      update: 'info',
      delete: 'error',
      payment: 'primary',
      expense: 'warning',
      enrollment: 'secondary',
      attendance: 'default'
    };
    return colors[action] || 'default';
  };

  const getActionText = (action) => {
    const texts = {
      create: 'Oluşturma',
      update: 'Güncelleme',
      delete: 'Silme',
      payment: 'Ödeme',
      expense: 'Gider',
      enrollment: 'Kayıt',
      attendance: 'Yoklama'
    };
    return texts[action] || action;
  };

  const getUserName = (username) => {
    const user = users.find(u => u.username === username);
    return user ? user.fullName : username;
  };

  if (loading) {
    return <LoadingSpinner message="Aktiviteler yükleniyor..." />;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Aktivite Logları
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Kullanıcı</InputLabel>
            <Select
              value={filters.user}
              label="Kullanıcı"
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            >
              <MenuItem value="">Tümü</MenuItem>
              {users.map((user) => (
                <MenuItem key={user._id} value={user.username}>
                  {user.fullName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>İşlem Tipi</InputLabel>
            <Select
              value={filters.action}
              label="İşlem Tipi"
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="create">Oluşturma</MenuItem>
              <MenuItem value="update">Güncelleme</MenuItem>
              <MenuItem value="delete">Silme</MenuItem>
              <MenuItem value="payment">Ödeme</MenuItem>
              <MenuItem value="expense">Gider</MenuItem>
              <MenuItem value="enrollment">Kayıt</MenuItem>
              <MenuItem value="attendance">Yoklama</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Varlık Tipi</InputLabel>
            <Select
              value={filters.entity}
              label="Varlık Tipi"
              onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="Student">Öğrenci</MenuItem>
              <MenuItem value="Course">Ders</MenuItem>
              <MenuItem value="Payment">Ödeme</MenuItem>
              <MenuItem value="Expense">Gider</MenuItem>
              <MenuItem value="Instructor">Eğitmen</MenuItem>
              <MenuItem value="CashRegister">Kasa</MenuItem>
            </Select>
          </FormControl>

          <TextField
            type="date"
            label="Başlangıç Tarihi"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />

          <TextField
            type="date"
            label="Bitiş Tarihi"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 180 }}
          />
        </Box>
      </Paper>

      {/* Activities Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tarih/Saat</TableCell>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>İşlem</TableCell>
              <TableCell>Varlık</TableCell>
              <TableCell>Açıklama</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">Aktivite kaydı bulunamadı</Typography>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity._id}>
                  <TableCell>
                    {new Date(activity.createdAt).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell>{getUserName(activity.user)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getActionText(activity.action)}
                      color={getActionColor(activity.action)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{activity.entity}</TableCell>
                  <TableCell>{activity.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={-1}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Sayfa başına satır:"
        />
      </TableContainer>
    </Box>
  );
};

export default ActivityLogs;
