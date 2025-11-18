import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, ContentCopy } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';

const MessageTemplates = () => {
  const { institution, currentUser } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'general',
    template: '',
    variables: []
  });

  useEffect(() => {
    if (institution) {
      loadTemplates();
    }
  }, [institution]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/message-templates', {
        params: { institution: institution._id },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        name: template.name || '',
        type: template.type || 'general',
        template: template.template || '',
        variables: template.variables || []
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        name: '',
        type: 'general',
        template: '',
        variables: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTemplate(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const templateData = {
        ...formData,
        institution: institution._id,
        createdBy: currentUser?.username,
        updatedBy: currentUser?.username,
      };

      if (selectedTemplate) {
        await api.put(`/message-templates/${selectedTemplate._id}`, templateData);
      } else {
        await api.post('/message-templates', templateData);
      }

      await loadTemplates();
      handleCloseDialog();
      setSuccess('Şablon başarıyla kaydedildi');
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/message-templates/${selectedTemplate._id}`);
      await loadTemplates();
      setOpenConfirm(false);
      setSelectedTemplate(null);
      setSuccess('Şablon silindi');
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  const handleCopy = (template) => {
    navigator.clipboard.writeText(template);
    setSuccess('Metin kopyalandı');
  };

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      template: prev.template + ' ' + variable
    }));
  };

  if (loading) {
    return <LoadingSpinner message="Şablonlar yükleniyor..." />;
  }

  if (!institution) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum seçin
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Mesaj Şablonları</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Yeni Şablon
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {templates.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Henüz mesaj şablonu eklenmedi</Typography>
            </Paper>
          </Grid>
        ) : (
          templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template._id}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {template.name}
                  </Typography>
                  <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block' }}>
                    {template.type === 'general' ? 'Genel' :
                     template.type === 'payment' ? 'Ödeme' :
                     template.type === 'reminder' ? 'Hatırlatma' : 'Hoş Geldin'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: 'pre-line',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {template.template}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(template.template)}
                    color="primary"
                    title="Kopyala"
                  >
                    <ContentCopy />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(template)}
                    color="info"
                    title="Düzenle"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setOpenConfirm(true);
                    }}
                    color="error"
                    title="Sil"
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedTemplate ? 'Şablon Düzenle' : 'Yeni Şablon'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Şablon Adı"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Tip</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    label="Tip"
                  >
                    <MenuItem value="general">Genel</MenuItem>
                    <MenuItem value="payment">Ödeme</MenuItem>
                    <MenuItem value="reminder">Hatırlatma</MenuItem>
                    <MenuItem value="welcome">Hoş Geldin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Kullanılabilir Değişkenler (Tıklayın):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    {['(Ad)', '(Soyad)', '(Telefon)', '(Email)', '(Tutar)', '(Tarih)'].map((variable) => (
                      <Button
                        key={variable}
                        size="small"
                        variant="outlined"
                        onClick={() => insertVariable(variable)}
                      >
                        {variable}
                      </Button>
                    ))}
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  label="Mesaj Şablonu"
                  name="template"
                  value={formData.template}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleDelete}
        title="Şablon Sil"
        message="Bu şablonu silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
      />
    </Box>
  );
};

export default MessageTemplates;
