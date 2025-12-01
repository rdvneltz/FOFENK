import React, { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import { Close, AttachFile, Delete } from '@mui/icons-material';
import api from '../../api';
import { useApp } from '../../context/AppContext';

// Default template for custom messages
const DEFAULT_TEMPLATE = {
  _id: 'custom',
  name: 'Özel Mesaj',
  template: '',
  type: 'general',
};

const EmailDialog = ({ open, onClose, recipients = [], onSuccess, defaultSubject = '', defaultMessage = '' }) => {
  const { institution } = useApp();
  const [templates, setTemplates] = useState([DEFAULT_TEMPLATE]);
  const [formData, setFormData] = useState({
    templateId: 'custom',
    subject: defaultSubject,
    message: defaultMessage,
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState('');

  // Load templates from database when dialog opens
  useEffect(() => {
    if (open && institution) {
      loadTemplates();
    }
  }, [open, institution]);

  // Update form when default values change
  useEffect(() => {
    if (defaultSubject || defaultMessage) {
      setFormData(prev => ({
        ...prev,
        subject: defaultSubject || prev.subject,
        message: defaultMessage || prev.message,
      }));
    }
  }, [defaultSubject, defaultMessage]);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.get('/message-templates', {
        params: { institution: institution._id },
      });
      setTemplates([DEFAULT_TEMPLATE, ...response.data]);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Keep using default template on error
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const selectedTemplate = templates.find(t => t._id === templateId) || DEFAULT_TEMPLATE;
    setFormData({
      templateId,
      subject: selectedTemplate.name !== 'Özel Mesaj' ? selectedTemplate.name : '',
      message: selectedTemplate.template || '',
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
        const message = replaceVariables(formData.message, recipient);

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
        // Bulk send - variables will be replaced on server side for each recipient
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
      templateId: 'custom',
      subject: '',
      message: '',
    });
    setAttachments([]);
    setError('');
    onClose();
  };

  // Helper function to replace template variables
  const replaceVariables = (text, recipient) => {
    return text
      .replace(/{studentName}/g, recipient.name || '')
      .replace(/{name}/g, recipient.name || '')
      .replace(/{email}/g, recipient.email || '')
      .replace(/{phone}/g, recipient.phone || '');
  };

  // Get type label for template display
  const getTypeLabel = (type) => {
    switch (type) {
      case 'paymentPlan': return 'Ödeme Planı';
      case 'paymentReminder': return 'Ödeme Hatırlatma';
      case 'trialLessonReminder': return 'Deneme Dersi';
      case 'lessonReminder': return 'Ders Hatırlatma';
      default: return 'Genel';
    }
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
            value={formData.templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            label="Şablon Seç"
            disabled={loadingTemplates}
            startAdornment={loadingTemplates ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          >
            {templates.map((template) => (
              <MenuItem key={template._id} value={template._id}>
                {template.name}
                {template._id !== 'custom' && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({getTypeLabel(template.type)})
                  </Typography>
                )}
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
          helperText="Değişkenler: {studentName}, {parentName}, {courseName}, {amount}, {date}, {time}"
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
