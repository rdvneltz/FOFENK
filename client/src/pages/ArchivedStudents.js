import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { ArrowBack, Unarchive, Delete } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const ArchivedStudents = () => {
  const navigate = useNavigate();
  const { institution, season, user } = useApp();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, student: null });

  useEffect(() => {
    if (season && institution) {
      loadArchivedStudents();
    }
  }, [season, institution]);

  const loadArchivedStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students/archived/list', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading archived students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (student) => {
    try {
      await api.post(`/students/${student._id}/unarchive`, {
        unarchivedBy: user?.username
      });
      alert(`${student.firstName} ${student.lastName} arşivden çıkarıldı`);
      loadArchivedStudents();
    } catch (error) {
      alert('Arşivden çıkarma hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/students/${deleteDialog.student._id}`, {
        data: { deletedBy: user?.username }
      });
      alert(`${deleteDialog.student.firstName} ${deleteDialog.student.lastName} kalıcı olarak silindi`);
      setDeleteDialog({ open: false, student: null });
      loadArchivedStudents();
    } catch (error) {
      alert('Silme hatası: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Arşiv yükleniyor..." />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/students')}>
          Öğrencilere Dön
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Arşivlenmiş Öğrenciler
        </Typography>
      </Box>

      {students.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Arşivlenmiş öğrenci bulunmuyor
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ad Soyad</TableCell>
                <TableCell>Arşivlenme Tarihi</TableCell>
                <TableCell>Arşivleme Sebebi</TableCell>
                <TableCell>Bakiye</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student._id}>
                  <TableCell>
                    <Typography variant="body1">
                      {student.firstName} {student.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {student.archivedDate
                      ? new Date(student.archivedDate).toLocaleDateString('tr-TR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {student.archiveReason || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`₺${Math.abs(student.balance || 0).toLocaleString('tr-TR')}`}
                      color={student.balance > 0 ? 'error' : 'success'}
                      size="small"
                    />
                    {student.balance > 0 && (
                      <Typography variant="caption" color="error" display="block">
                        Borçlu
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleUnarchive(student)}
                      title="Arşivden Çıkar"
                    >
                      <Unarchive />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, student })}
                      title="Kalıcı Sil"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, student: null })}
      >
        <DialogTitle>Öğrenciyi Kalıcı Olarak Sil</DialogTitle>
        <DialogContent>
          {deleteDialog.student && (
            <>
              <Alert severity="error" sx={{ mb: 2 }}>
                ⚠️ Bu işlem geri alınamaz! Tüm kayıtlar silinecek.
              </Alert>
              <Typography>
                <strong>{deleteDialog.student.firstName} {deleteDialog.student.lastName}</strong> öğrencisini
                kalıcı olarak silmek istediğinizden emin misiniz?
              </Typography>
              {deleteDialog.student.balance > 0 && (
                <Typography color="warning.main" sx={{ mt: 2 }}>
                  Bu öğrencinin {deleteDialog.student.balance.toLocaleString('tr-TR')} TL borcu var!
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, student: null })}>
            İptal
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Kalıcı Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArchivedStudents;
