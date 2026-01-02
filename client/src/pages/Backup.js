import React, { useState, useEffect } from 'react';
import {
  Container,
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
  DialogContentText,
  CircularProgress,
  Alert,
  Snackbar,
  Box,
  Chip
} from '@mui/material';
import {
  Backup as BackupIcon,
  Download as DownloadIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  TableChart as ExcelIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const Backup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({ open: false, backup: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, backup: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/backup/list');
      setBackups(response.data);
    } catch (error) {
      console.error('Error fetching backups:', error);
      showSnackbar('Yedekler yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await axios.post('/api/backup/create');
      showSnackbar('Yedek başarıyla oluşturuldu', 'success');
      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      showSnackbar('Yedek oluşturulurken hata oluştu', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backupName) => {
    try {
      const response = await axios.get(`/api/backup/download/${backupName}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${backupName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showSnackbar('Yedek indirildi', 'success');
    } catch (error) {
      console.error('Error downloading backup:', error);
      showSnackbar('Yedek indirilirken hata oluştu', 'error');
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.backup) return;

    try {
      await axios.post(`/api/backup/restore/${restoreDialog.backup.name}`);
      showSnackbar('Yedek başarıyla geri yüklendi', 'success');
      setRestoreDialog({ open: false, backup: null });
    } catch (error) {
      console.error('Error restoring backup:', error);
      showSnackbar('Yedek geri yüklenirken hata oluştu', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.backup) return;

    try {
      await axios.delete(`/api/backup/${deleteDialog.backup.name}`);
      showSnackbar('Yedek silindi', 'success');
      setDeleteDialog({ open: false, backup: null });
      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      showSnackbar('Yedek silinirken hata oluştu', 'error');
    }
  };

  const handleDownloadExcelBackup = async () => {
    try {
      setDownloadingExcel(true);
      showSnackbar('Excel yedek hazırlanıyor, lütfen bekleyin...', 'info');

      const response = await axios.get('/api/export/full-backup', {
        responseType: 'blob',
        timeout: 120000 // 2 minutes timeout for large data
      });

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'FOFORA-Yedek.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSnackbar('Excel yedek indirildi!', 'success');
    } catch (error) {
      console.error('Error downloading Excel backup:', error);
      showSnackbar('Excel yedek indirilirken hata oluştu', 'error');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Excel Backup Section - Human Readable */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#e8f5e9' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ExcelIcon color="success" />
              Okunabilir Excel Yedek
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tüm verilerinizi (öğrenciler, ödemeler, giderler, kasalar vb.) tek bir Excel dosyasında indirin.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={downloadingExcel ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadExcelBackup}
            disabled={downloadingExcel}
            sx={{ minWidth: 200 }}
          >
            {downloadingExcel ? 'Hazırlanıyor...' : 'Excel Yedek İndir'}
          </Button>
        </Box>
        <Alert severity="success" icon={false}>
          <Typography variant="body2">
            <strong>Bu yedek sisteme bağımlı değildir!</strong> İndirdiğiniz Excel dosyasını herhangi bir bilgisayarda açarak tüm verilerinizi görebilirsiniz:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Öğrenci listesi ve iletişim bilgileri</li>
            <li>Ödeme planları ve taksit detayları</li>
            <li>Kasa bakiyeleri ve hareketler</li>
            <li>Giderler ve eğitmen ödemeleri</li>
            <li>Ders programları ve yoklama kayıtları</li>
          </Box>
        </Alert>
      </Paper>

      {/* Database Backup Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            Veritabanı Yedekleme (Teknik)
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchBackups}
              sx={{ mr: 2 }}
              disabled={loading}
            >
              Yenile
            </Button>
            <Button
              variant="contained"
              startIcon={<BackupIcon />}
              onClick={handleCreateBackup}
              disabled={creating}
            >
              {creating ? 'Oluşturuluyor...' : 'Yeni Yedek Al'}
            </Button>
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Otomatik yedekleme her gece saat 02:00'da çalışır. Son 30 günün yedekleri saklanır.
          <br />
          <strong>Not:</strong> Bu yedekler teknik formatta olup sisteme geri yükleme için kullanılır.
        </Alert>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Render Free Tier Uyarısı:</strong> Teknik yedekleme Render ücretsiz sürümde çalışmaz (mongodump yüklü değil).
          <br />
          Alternatifler:
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Excel Yedek:</strong> Yukarıdaki yeşil butonu kullanın - tüm verilerinizi Excel olarak indirir</li>
            <li><strong>MongoDB Atlas:</strong> Atlas Dashboard → Backup → Take Snapshot</li>
          </ul>
        </Alert>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : backups.length === 0 ? (
          <Alert severity="warning">Henüz yedek bulunmuyor.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Yedek Adı</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Boyut</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.name}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {backup.name}
                        {backups.indexOf(backup) === 0 && (
                          <Chip label="En Yeni" size="small" color="primary" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {format(new Date(backup.created), 'dd.MM.yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{backup.sizeFormatted}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => handleDownload(backup.name)}
                        title="İndir"
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton
                        color="success"
                        onClick={() => setRestoreDialog({ open: true, backup })}
                        title="Geri Yükle"
                      >
                        <RestoreIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, backup })}
                        title="Sil"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog.open} onClose={() => setRestoreDialog({ open: false, backup: null })}>
        <DialogTitle>Yedek Geri Yükle</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{restoreDialog.backup?.name}</strong> yedeğini geri yüklemek istediğinize emin misiniz?
            <br /><br />
            <Alert severity="warning">
              Bu işlem mevcut veritabanını tamamen değiştirecektir. İşlem geri alınamaz!
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, backup: null })}>
            İptal
          </Button>
          <Button onClick={handleRestore} variant="contained" color="success" autoFocus>
            Geri Yükle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, backup: null })}>
        <DialogTitle>Yedek Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteDialog.backup?.name}</strong> yedeğini silmek istediğinize emin misiniz?
            <br />
            Bu işlem geri alınamaz!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, backup: null })}>
            İptal
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error" autoFocus>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Backup;
