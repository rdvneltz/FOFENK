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
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    student: null,
    relatedRecords: null,
    loading: false,
    showDeleteConfirm: false
  });

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

  const handleOpenDeleteDialog = async (student) => {
    try {
      setDeleteDialog({ open: true, student, relatedRecords: null, loading: true, showDeleteConfirm: false });

      // Fetch related records
      const response = await api.get(`/students/${student._id}/check-related-records`);
      setDeleteDialog(prev => ({
        ...prev,
        relatedRecords: response.data,
        loading: false
      }));
    } catch (error) {
      alert('İlgili kayıtlar yüklenirken hata oluştu: ' + (error.response?.data?.message || error.message));
      setDeleteDialog({ open: false, student: null, relatedRecords: null, loading: false, showDeleteConfirm: false });
    }
  };

  // keepPayments: true = preserve payment records, false = delete and revert cash register
  const handleDelete = async (keepPayments = false) => {
    try {
      await api.delete(`/students/${deleteDialog.student._id}?keepPayments=${keepPayments}`, {
        data: { deletedBy: user?.username, keepPayments }
      });
      const message = keepPayments
        ? `${deleteDialog.student.firstName} ${deleteDialog.student.lastName} silindi (ödeme kayıtları korundu)`
        : `${deleteDialog.student.firstName} ${deleteDialog.student.lastName} ve tüm kayıtları silindi`;
      alert(message);
      setDeleteDialog({ open: false, student: null, relatedRecords: null, loading: false, showDeleteConfirm: false });
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
                      onClick={() => handleOpenDeleteDialog(student)}
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
        onClose={() => setDeleteDialog({ open: false, student: null, relatedRecords: null, loading: false, showDeleteConfirm: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Öğrenciyi Kalıcı Olarak Sil</DialogTitle>
        <DialogContent>
          {deleteDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <LoadingSpinner message="İlgili kayıtlar kontrol ediliyor..." />
            </Box>
          ) : deleteDialog.student && deleteDialog.relatedRecords ? (
            <>
              <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                ⚠️ Bu işlem geri alınamaz! Öğrenci ve ilgili tüm kayıtlar silinecek.
              </Alert>
              <Typography sx={{ mb: 2 }}>
                <strong>{deleteDialog.student.firstName} {deleteDialog.student.lastName}</strong> öğrencisi için
                {' '}{deleteDialog.relatedRecords.totals.paymentCount} gelir ve {deleteDialog.relatedRecords.totals.expenseCount} gider kaydı bulundu:
              </Typography>

              {/* Totals Summary */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Özet</Typography>
                <Typography>
                  <strong>Toplam Gelir:</strong> ₺{deleteDialog.relatedRecords.totals.totalIncome.toLocaleString('tr-TR')}
                  {' '}({deleteDialog.relatedRecords.totals.paymentCount} kayıt)
                </Typography>
                <Typography>
                  <strong>Toplam Gider:</strong> ₺{deleteDialog.relatedRecords.totals.totalExpense.toLocaleString('tr-TR')}
                  {' '}({deleteDialog.relatedRecords.totals.expenseCount} kayıt)
                </Typography>
                {deleteDialog.relatedRecords.student.balance > 0 && (
                  <Typography color="warning.main">
                    <strong>Kalan Borç:</strong> ₺{deleteDialog.relatedRecords.student.balance.toLocaleString('tr-TR')}
                  </Typography>
                )}
              </Box>

              {/* Payments List */}
              {deleteDialog.relatedRecords.payments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom><strong>Gelir Kayıtları:</strong></Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    {deleteDialog.relatedRecords.payments.map((payment) => (
                      <Typography key={payment._id} variant="body2" sx={{ mb: 0.5 }}>
                        • {new Date(payment.date).toLocaleDateString('tr-TR')} -
                        {' '}₺{payment.amount.toLocaleString('tr-TR')} -
                        {' '}{payment.course} - {payment.paymentType === 'creditCard' ? 'Kredi Kartı' : 'Nakit'}
                        {payment.isInvoiced && ' (Faturalı)'}
                        {payment.isRefunded && ' (İade Edilmiş)'}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Expenses List */}
              {deleteDialog.relatedRecords.expenses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom><strong>Gider Kayıtları:</strong></Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto', p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    {deleteDialog.relatedRecords.expenses.map((expense) => (
                      <Typography key={expense._id} variant="body2" sx={{ mb: 0.5 }}>
                        • {new Date(expense.date).toLocaleDateString('tr-TR')} -
                        {' '}₺{expense.amount.toLocaleString('tr-TR')} -
                        {' '}{expense.category} - {expense.description}
                        {expense.isAutoGenerated && ' (Otomatik)'}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {deleteDialog.relatedRecords.totals.paymentCount > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Silme seçenekleri:
                  </Typography>
                  <Typography variant="body2">
                    <strong>Sadece Öğrenciyi Sil:</strong> Öğrenci silinir ama ödeme kayıtları kasalarda kalır. Kasa bakiyeleri ve gelir-gider raporları değişmez.
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Tümünü Sil:</strong> Öğrenci ve tüm ödeme kayıtları silinir. Kasalardan toplam ₺{deleteDialog.relatedRecords.totals.totalIncome.toLocaleString('tr-TR')} düşülür.
                  </Typography>
                </Alert>
              )}
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1, p: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, student: null, relatedRecords: null, loading: false, showDeleteConfirm: false })}
            sx={{ order: { xs: 3, sm: 1 } }}
          >
            İptal
          </Button>
          {deleteDialog.relatedRecords && deleteDialog.relatedRecords.totals.paymentCount > 0 && (
            <Button
              onClick={() => handleDelete(true)}
              variant="outlined"
              color="warning"
              sx={{ order: { xs: 2, sm: 2 } }}
            >
              Sadece Öğrenciyi Sil
              <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                (Ödemeler korunsun)
              </Typography>
            </Button>
          )}
          {deleteDialog.relatedRecords && (
            <Button
              onClick={() => handleDelete(false)}
              variant="contained"
              color="error"
              sx={{ order: { xs: 1, sm: 3 } }}
            >
              Tümünü Sil
              {deleteDialog.relatedRecords.totals.paymentCount > 0 && (
                <Typography variant="caption" display="block" sx={{ fontSize: '0.65rem' }}>
                  (Kasalardan düşülsün)
                </Typography>
              )}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArchivedStudents;
