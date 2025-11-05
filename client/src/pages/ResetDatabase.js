import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  Box,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Warning, DeleteForever } from '@mui/icons-material';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const ResetDatabase = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [counts, setCounts] = useState(null);

  const handleReset = async () => {
    if (!window.confirm('⚠️ DİKKAT!\n\nTÜM VERİLER SİLİNECEK!\n\nBu işlem GERİ ALINAMAZ!\n\nEmin misiniz?')) {
      return;
    }

    if (!window.confirm('SON UYARI!\n\nŞu silinecek:\n- Tüm kullanıcılar\n- Tüm kurumlar\n- Tüm öğrenciler\n- Tüm dersler\n- Tüm ödemeler\n- HER ŞEY!\n\nGerçekten devam etmek istiyor musunuz?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/admin/reset-database', { token });

      setCounts(response.data.counts);
      setSuccess(true);

      // 3 saniye sonra setup sayfasına yönlendir
      setTimeout(() => {
        navigate('/setup');
      }, 3000);

    } catch (error) {
      if (error.response?.status === 403) {
        setError('Geçersiz token! Doğru reset token\'ını girin.');
      } else {
        setError(error.response?.data?.message || 'Database sıfırlanamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Warning sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom color="error">
            ⚠️ Database Sıfırlama
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tüm verileri silmek için reset token'ını girin
          </Typography>
        </Box>

        {!success ? (
          <>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>DİKKAT: BU İŞLEM GERİ ALINAMAZ!</strong>
              </Typography>
              <Typography variant="body2">
                Aşağıdaki tüm veriler kalıcı olarak silinecek:
              </Typography>
            </Alert>

            <List dense sx={{ mb: 3 }}>
              <ListItem>
                <ListItemText primary="✅ Tüm kullanıcılar ve şifreler" />
              </ListItem>
              <ListItem>
                <ListItemText primary="✅ Tüm kurumlar ve sezonlar" />
              </ListItem>
              <ListItem>
                <ListItemText primary="✅ Tüm öğrenciler ve kayıtlar" />
              </ListItem>
              <ListItem>
                <ListItemText primary="✅ Tüm dersler ve eğitmenler" />
              </ListItem>
              <ListItem>
                <ListItemText primary="✅ Tüm ödemeler ve giderler" />
              </ListItem>
              <ListItem>
                <ListItemText primary="✅ Tüm aktivite logları" />
              </ListItem>
              <ListItem>
                <ListItemText primary="✅ HER ŞEY!" />
              </ListItem>
            </List>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Reset Token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="RESET_FOFORA_2025"
              sx={{ mb: 3 }}
              helperText="Token: RESET_FOFORA_2025"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/')}
              >
                İptal
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={handleReset}
                disabled={loading || !token}
                startIcon={<DeleteForever />}
              >
                {loading ? 'Siliniyor...' : 'TÜM VERİLERİ SİL'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              ✅ Database başarıyla sıfırlandı!
            </Alert>

            <Typography variant="h6" gutterBottom>
              Silinen Kayıtlar:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemText primary={`Kullanıcılar: ${counts?.users || 0}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Kurumlar: ${counts?.institutions || 0}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Sezonlar: ${counts?.seasons || 0}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Öğrenciler: ${counts?.students || 0}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Dersler: ${counts?.courses || 0}`} />
              </ListItem>
              <ListItem>
                <ListItemText primary={`Ödemeler: ${counts?.payments || 0}`} />
              </ListItem>
            </List>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              3 saniye içinde setup sayfasına yönlendirileceksiniz...
            </Typography>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default ResetDatabase;
