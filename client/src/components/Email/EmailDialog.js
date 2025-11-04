import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import { Close, AttachFile, Delete } from '@mui/icons-material';
import api from '../../api';

const EMAIL_TEMPLATES = {
  custom: {
    label: 'Özel Mesaj',
    subject: '',
    message: '',
  },
  welcome: {
    label: 'Hoşgeldin Mesajı',
    subject: 'Fofora Tiyatro\'ya Hoş Geldiniz!',
    message: 'Merhaba {name},\n\nFofora Tiyatro ailesine katıldığınız için çok mutluyuz! Sizinle çalışmak bizim için bir onur.\n\nEğitim süreciniz boyunca size en iyi deneyimi sunmak için buradayız.\n\nSaygılarımızla,\nFofora Tiyatro Ekibi',
  },
  paymentReminder: {
    label: 'Ödeme Hatırlatma',
    subject: 'Ödeme Hatırlatması',
    message: 'Sayın {name},\n\nYaklaşan veya gecikmiş ödemeleriniz bulunmaktadır. Lütfen ödemelerinizi zamanında yapmanızı rica ederiz.\n\nDetaylı bilgi için bizimle iletişime geçebilirsiniz.\n\nSaygılarımızla,\nFofora Tiyatro Ekibi',
  },
  lessonReminder: {
    label: 'Ders Hatırlatma',
    subject: 'Ders Hatırlatması',
    message: 'Sayın {name},\n\nDersiniz yaklaşıyor! Size hatırlatmak istedik.\n\nLütfen dersinize 10 dakika önce gelerek hazırlıklarınızı yapınız.\n\nGörüşmek üzere!\nFofora Tiyatro Ekibi',
  },
  general: {
    label: 'Genel Bilgilendirme',
    subject: 'Fofora Tiyatro - Bilgilendirme',
    message: 'Sayın {name},\n\n[Mesajınızı buraya yazın]\n\nSaygılarımızla,\nFofora Tiyatro Ekibi',
  },
};

const EmailDialog = ({ open, onClose, recipients = [], onSuccess }) => {
  const [formData, setFormData] = useState({
    template: 'custom',
    subject: '',
    message: '',
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTemplateChange = (template) => {
    const selectedTemplate = EMAIL_TEMPLATES[template];
    setFormData({
      template,
      subject: selectedTemplate.subject,
      message: selectedTemplate.message,
    });
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => file.size <= 10 * 1024 * 1024); // 10MB limit

    if (validFiles.length !== files.length) {
      setError('Bazı dosyalar 10MB limitini aşıyor ve eklenmedi.');
    }

    setAttachments([...attachments, ...validFiles]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (!formData.subject.trim()) {
        setError('Konu alanı zorunludur');
        return;
      }

      if (!formData.message.trim()) {
        setError('Mesaj alanı zorunludur');
        return;
      }

      if (recipients.length === 0) {
        setError('En az bir alıcı seçmelisiniz');
        return;
      }

      // Single recipient
      if (recipients.length === 1) {
        const recipient = recipients[0];
        const message = formData.message.replace(/{name}/g, recipient.name || '');

        const formDataToSend = new FormData();
        formDataToSend.append('to', recipient.email);
        formDataToSend.append('subject', formData.subject);
        formDataToSend.append('message', message);
        formDataToSend.append('studentName', recipient.name || '');

        attachments.forEach((file) => {
          formDataToSend.append('attachments', file);
        });

        await api.post('/email/send', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Bulk send
        const formDataToSend = new FormData();
        formDataToSend.append('recipients', JSON.stringify(recipients));
        formDataToSend.append('subject', formData.subject);
        formDataToSend.append('message', formData.message);

        attachments.forEach((file) => {
          formDataToSend.append('attachments', file);
        });

        await api.post('/email/bulk', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (err) {
      console.error('Email gönderme hatası:', err);
      setError(err.response?.data?.message || 'Email gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      template: 'custom',
      subject: '',
      message: '',
    });
    setAttachments([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Email Gönder</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Alıcılar ({recipients.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {recipients.slice(0, 5).map((recipient, index) => (
              <Chip
                key={index}
                label={recipient.name || recipient.email}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            {recipients.length > 5 && (
              <Chip
                label={`+${recipients.length - 5} daha`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Şablon Seç</InputLabel>
          <Select
            value={formData.template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            label="Şablon Seç"
          >
            {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
              <MenuItem key={key} value={key}>
                {template.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Konu"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          fullWidth
          label="Mesaj"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          multiline
          rows={10}
          sx={{ mb: 2 }}
          required
          helperText="İpucu: {name} yazarak alıcının adını otomatik ekleyebilirsiniz"
        />

        <Box sx={{ mb: 2 }}>
          <input
            type="file"
            id="email-attachments"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <label htmlFor="email-attachments">
            <Button
              variant="outlined"
              component="span"
              startIcon={<AttachFile />}
              size="small"
            >
              Dosya Ekle
            </Button>
          </label>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
            Maksimum 10MB, toplam 5 dosya
          </Typography>
        </Box>

        {attachments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Ekli Dosyalar:
            </Typography>
            {attachments.map((file, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  mb: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveAttachment(index)}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || recipients.length === 0}
        >
          {loading ? 'Gönderiliyor...' : 'Gönder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailDialog;
