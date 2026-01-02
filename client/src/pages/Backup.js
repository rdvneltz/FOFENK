import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Alert,
  Snackbar,
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Backup as BackupIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  TableChart as ExcelIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import api from '../api';

const Backup = () => {
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({ open: false, file: null });
  const [restoreResult, setRestoreResult] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  // Download Excel backup (human-readable)
  const handleDownloadExcelBackup = async () => {
    try {
      setDownloadingExcel(true);
      showSnackbar('Excel yedek hazırlanıyor, lütfen bekleyin...', 'info');

      const response = await api.get('/export/full-backup', {
        responseType: 'blob',
        timeout: 120000
      });

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

  // Download JSON backup (restorable)
  const handleDownloadJsonBackup = async () => {
    try {
      setDownloadingJson(true);
      showSnackbar('Teknik yedek hazırlanıyor, lütfen bekleyin...', 'info');

      const response = await api.get('/backup/download-json', {
        responseType: 'blob',
        timeout: 120000
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'FOFORA-Backup.zip';
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

      showSnackbar('Teknik yedek indirildi!', 'success');
    } catch (error) {
      console.error('Error downloading JSON backup:', error);
      showSnackbar('Teknik yedek indirilirken hata oluştu', 'error');
    } finally {
      setDownloadingJson(false);
    }
  };

  // Handle file selection for restore
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setRestoreDialog({ open: true, file });
    }
    // Reset file input
    event.target.value = '';
  };

  // Restore from backup file
  const handleRestore = async () => {
    if (!restoreDialog.file) return;

    try {
      setUploading(true);
      setRestoreDialog({ open: false, file: null });
      showSnackbar('Yedek geri yükleniyor, lütfen bekleyin...', 'info');

      const formData = new FormData();
      formData.append('backup', restoreDialog.file);

      const response = await api.post('/backup/restore-json', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutes for large backups
      });

      if (response.data.success) {
        setRestoreResult(response.data);
        showSnackbar('Yedek başarıyla geri yüklendi!', 'success');
      } else {
        showSnackbar(response.data.message || 'Geri yükleme başarısız', 'error');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      showSnackbar(error.response?.data?.message || 'Geri yükleme sırasında hata oluştu', 'error');
    } finally {
      setUploading(false);
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
              Tüm verilerinizi Excel dosyasında indirin. Herhangi bir bilgisayarda açılabilir.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={downloadingExcel ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadExcelBackup}
            disabled={downloadingExcel || downloadingJson || uploading}
            sx={{ minWidth: 200 }}
          >
            {downloadingExcel ? 'Hazırlanıyor...' : 'Excel İndir'}
          </Button>
        </Box>
        <Alert severity="success" icon={false}>
          <Typography variant="body2">
            <strong>Sadece okumak için!</strong> Bu yedek sisteme geri yüklenemez ama tüm verilerinizi görebilirsiniz:
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li>Öğrenci listesi ve iletişim bilgileri</li>
            <li>Ödeme planları ve taksit detayları</li>
            <li>Kasa bakiyeleri, giderler, eğitmenler</li>
          </Box>
        </Alert>
      </Paper>

      {/* Technical Backup Section - Restorable */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon color="primary" />
              Teknik Yedek (Geri Yüklenebilir)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Veritabanının tam yedeği. Sisteme geri yüklenebilir.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={downloadingJson ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownloadJsonBackup}
              disabled={downloadingExcel || downloadingJson || uploading}
              sx={{ minWidth: 180 }}
            >
              {downloadingJson ? 'Hazırlanıyor...' : 'Yedek İndir'}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              size="large"
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={downloadingExcel || downloadingJson || uploading}
              sx={{ minWidth: 180 }}
            >
              {uploading ? 'Yükleniyor...' : 'Yedek Yükle'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".zip"
              style={{ display: 'none' }}
            />
          </Box>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Nasıl Çalışır:</strong>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
            <li><strong>Yedek İndir:</strong> Tüm veritabanını ZIP dosyası olarak bilgisayarınıza indirin</li>
            <li><strong>Yedek Yükle:</strong> Daha önce indirdiğiniz yedeği sisteme geri yükleyin</li>
          </Box>
        </Alert>

        <Alert severity="warning">
          <strong>Dikkat:</strong> Yedek yüklemek mevcut tüm verileri SİLER ve yedekteki verilerle değiştirir. Bu işlem geri alınamaz!
        </Alert>
      </Paper>

      {/* Restore Result */}
      {restoreResult && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd' }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon color="success" />
            Geri Yükleme Tamamlandı
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Yedek Tarihi: {new Date(restoreResult.backupDate).toLocaleString('tr-TR')}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <List dense>
            {restoreResult.results?.map((result, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {result.status === 'success' ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : result.status === 'error' ? (
                    <WarningIcon color="error" fontSize="small" />
                  ) : (
                    <WarningIcon color="disabled" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={result.collection}
                  secondary={result.status === 'success' ? `${result.count} kayıt` : result.status}
                />
              </ListItem>
            ))}
          </List>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setRestoreResult(null)}
            sx={{ mt: 2 }}
          >
            Kapat
          </Button>
        </Paper>
      )}

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialog.open} onClose={() => setRestoreDialog({ open: false, file: null })}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Yedek Geri Yükle
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{restoreDialog.file?.name}</strong> dosyasını geri yüklemek istediğinize emin misiniz?
            <br /><br />
            <Alert severity="error">
              Bu işlem mevcut TÜM VERİLERİ SİLECEK ve yedekteki verilerle değiştirecektir. Bu işlem GERİ ALINAMAZ!
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false, file: null })}>
            İptal
          </Button>
          <Button onClick={handleRestore} variant="contained" color="error" autoFocus>
            Evet, Geri Yükle
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
