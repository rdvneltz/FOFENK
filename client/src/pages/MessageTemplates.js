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
  Tooltip,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Add, Edit, Delete, ContentCopy, Info } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';
import { TEMPLATE_VARIABLES, DEFAULT_WHATSAPP_TEMPLATES } from '../utils/whatsappHelper';

// Template type labels (Turkish)
const TEMPLATE_TYPE_LABELS = {
  paymentPlanCreated: 'Ödeme Planı Oluşturuldu',
  paymentReceived: 'Ödeme Alındı',
  paymentDueReminder: 'Vadesi Yaklaşan Ödeme',
  paymentOverdue: 'Vadesi Geçmiş Ödeme',
  balanceSummary: 'Bakiye Özeti',
  registrationConfirm: 'Kayıt Onayı',
  trialLessonReminder: 'Deneme Dersi Hatırlatma',
  lessonReminder: 'Ders Hatırlatma',
  general: 'Genel',
};

// Variable category labels (Turkish)
const CATEGORY_LABELS = {
  person: 'Kişi Bilgileri',
  course: 'Kurs/Kurum Bilgileri',
  date: 'Tarih/Saat Bilgileri',
  amount: 'Tutar Bilgileri',
  installment: 'Taksit Bilgileri',
  payment: 'Ödeme Bilgileri',
  list: 'Detaylı Listeler',
};

const MessageTemplates = () => {
  const { institution, currentUser } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingDefaults, setCreatingDefaults] = useState(false);
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

  // Create default templates for the institution
  const createDefaultTemplates = async () => {
    try {
      setCreatingDefaults(true);
      setError('');

      const defaultTemplateConfigs = [
        { type: 'paymentPlanCreated', name: 'Ödeme Planı Oluşturuldu' },
        { type: 'paymentReceived', name: 'Ödeme Alındı' },
        { type: 'paymentDueReminder', name: 'Vadesi Yaklaşan Ödeme Hatırlatma' },
        { type: 'paymentOverdue', name: 'Vadesi Geçmiş Ödeme' },
        { type: 'balanceSummary', name: 'Bakiye Özeti' },
        { type: 'registrationConfirm', name: 'Kayıt Onayı' },
        { type: 'trialLessonReminder', name: 'Deneme Dersi Hatırlatma' },
        { type: 'lessonReminder', name: 'Ders Hatırlatma' },
        { type: 'general', name: 'Genel Mesaj' },
      ];

      // Get existing template types
      const existingTypes = templates.map(t => t.type);

      // Create only missing templates
      const missingTemplates = defaultTemplateConfigs.filter(
        config => !existingTypes.includes(config.type)
      );

      if (missingTemplates.length === 0) {
        setSuccess('Tüm varsayılan şablonlar zaten mevcut');
        return;
      }

      // Create missing templates
      for (const config of missingTemplates) {
        const templateContent = DEFAULT_WHATSAPP_TEMPLATES[config.type] || DEFAULT_WHATSAPP_TEMPLATES.general;
        await api.post('/message-templates', {
          name: config.name,
          type: config.type,
          template: templateContent,
          institution: institution._id,
          isDefault: true,
          createdBy: currentUser?.username,
          updatedBy: currentUser?.username,
        });
      }

      await loadTemplates();
      setSuccess(`${missingTemplates.length} varsayılan şablon oluşturuldu`);
    } catch (error) {
      console.error('Error creating default templates:', error);
      setError('Varsayılan şablonlar oluşturulurken bir hata oluştu');
    } finally {
      setCreatingDefaults(false);
    }
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={createDefaultTemplates}
            disabled={creatingDefaults}
          >
            {creatingDefaults ? 'Oluşturuluyor...' : 'Varsayılan Şablonları Ekle'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Yeni Şablon
          </Button>
        </Box>
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
                  <Chip
                    label={TEMPLATE_TYPE_LABELS[template.type] || 'Genel'}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
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
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <FormControl fullWidth required>
                    <InputLabel>Tip</InputLabel>
                    <Select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      label="Tip"
                    >
                      {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Tooltip title="Seçili tip için varsayılan şablon içeriğini yükle">
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1, minWidth: 'auto', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const defaultContent = DEFAULT_WHATSAPP_TEMPLATES[formData.type];
                        if (defaultContent) {
                          setFormData(prev => ({
                            ...prev,
                            template: defaultContent,
                            name: prev.name || TEMPLATE_TYPE_LABELS[formData.type]
                          }));
                        }
                      }}
                    >
                      Varsayılan Yükle
                    </Button>
                  </Tooltip>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info fontSize="small" color="primary" />
                    Kullanılabilir Değişkenler (Tıklayarak ekleyin)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Değişkenler mesaj gönderilirken otomatik olarak gerçek değerlerle değiştirilir
                  </Typography>

                  {Object.entries(CATEGORY_LABELS).map(([category, categoryLabel]) => {
                    const categoryVariables = TEMPLATE_VARIABLES.filter(v => v.category === category);
                    if (categoryVariables.length === 0) return null;

                    return (
                      <Accordion key={category} defaultExpanded={category === 'person' || category === 'amount'} sx={{ mb: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                          <Typography variant="body2" fontWeight="medium">{categoryLabel}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {categoryVariables.map((variable) => (
                              <Tooltip
                                key={variable.key}
                                title={
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">{variable.key}</Typography>
                                    <Typography variant="caption">{variable.description}</Typography>
                                  </Box>
                                }
                                arrow
                              >
                                <Chip
                                  label={variable.label}
                                  size="small"
                                  onClick={() => insertVariable(variable.key)}
                                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' } }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Box>

                <TextField
                  fullWidth
                  label="Mesaj Şablonu"
                  name="template"
                  value={formData.template}
                  onChange={handleChange}
                  multiline
                  rows={6}
                  required
                  placeholder="Mesaj şablonunuzu buraya yazın. Değişkenleri eklemek için yukarıdaki butonlara tıklayın."
                  helperText="Değişkenler {süslü parantez} içinde yazılır ve mesaj gönderilirken otomatik olarak değiştirilir"
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
