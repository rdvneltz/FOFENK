import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  Avatar,
} from '@mui/material';
import { WhatsApp, Email, Message, Description, Download, Share, Person, Phone } from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import api from '../../api';
import { sendWhatsAppMessage, replaceTemplateVariables, DEFAULT_WHATSAPP_TEMPLATES } from '../../utils/whatsappHelper';

// Template type labels
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

/**
 * NotificationMenu - Reusable component for sending WhatsApp/Email notifications
 *
 * Props:
 * - anchorEl: Menu anchor element
 * - open: Boolean to control menu visibility
 * - onClose: Function to close the menu
 * - recipientData: Object containing recipient info { name, phone, email }
 * - templateData: Object containing template variables
 * - defaultTemplate: Optional default template type to use
 * - onEmailClick: Function called when email is selected, receives (recipients, subject, message, templateData)
 * - mode: 'full' (show all options) | 'whatsapp' (only WhatsApp) | 'email' (only email)
 * - pageContext: String identifying which page is using this menu (e.g., 'students', 'paymentPlanDetail')
 *   Templates are filtered by their showOnPages setting. If 'allPages' is in showOnPages, it shows everywhere.
 */
const NotificationMenu = ({
  anchorEl,
  open,
  onClose,
  recipientData = {},
  templateData = {},
  defaultTemplate = null,
  onEmailClick,
  mode = 'full',
  pageContext = null, // Page context for filtering templates
  extraOptions = [], // Extra menu options: [{ icon, label, onClick }]
  studentId = null, // For status report generation
  studentData = null, // Full student data for phone selection
}) => {
  const { institution } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subMenuAnchor, setSubMenuAnchor] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null); // 'whatsapp' or 'email'

  // PDF share states
  const [pdfMenuAnchor, setPdfMenuAnchor] = useState(null);
  const [phoneSelectOpen, setPhoneSelectOpen] = useState(false);
  const [availablePhones, setAvailablePhones] = useState([]);
  const [pdfShareMode, setPdfShareMode] = useState(null); // 'whatsapp' or 'email'
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Get notification phone number from student data
  const getNotificationPhone = (student) => {
    if (!student) return null;

    const { defaultNotificationRecipient, phone, parentContacts, emergencyContact } = student;

    // Priority based on defaultNotificationRecipient
    if (defaultNotificationRecipient === 'student' && phone) {
      return { phone, name: `${student.firstName} ${student.lastName}`, type: 'Öğrenci' };
    }
    if (defaultNotificationRecipient === 'mother') {
      const mother = parentContacts?.find(p => p.relationship === 'Anne');
      if (mother?.phone) return { phone: mother.phone, name: mother.name, type: 'Anne' };
    }
    if (defaultNotificationRecipient === 'father') {
      const father = parentContacts?.find(p => p.relationship === 'Baba');
      if (father?.phone) return { phone: father.phone, name: father.name, type: 'Baba' };
    }

    // Fallback: student phone first
    if (phone) return { phone, name: `${student.firstName} ${student.lastName}`, type: 'Öğrenci' };

    // Then parents
    const parentWithPhone = parentContacts?.find(p => p.phone);
    if (parentWithPhone) return { phone: parentWithPhone.phone, name: parentWithPhone.name, type: parentWithPhone.relationship };

    // Finally emergency contact
    if (emergencyContact?.phone) return { phone: emergencyContact.phone, name: emergencyContact.name, type: 'Acil Durum' };

    return null;
  };

  // Get all available phones for selection
  const getAllPhones = (student) => {
    if (!student) return [];
    const phones = [];

    if (student.phone) {
      phones.push({ phone: student.phone, name: `${student.firstName} ${student.lastName}`, type: 'Öğrenci' });
    }

    student.parentContacts?.forEach(p => {
      if (p.phone) {
        phones.push({ phone: p.phone, name: p.name, type: p.relationship });
      }
    });

    if (student.emergencyContact?.phone) {
      phones.push({ phone: student.emergencyContact.phone, name: student.emergencyContact.name, type: 'Acil Durum' });
    }

    return phones;
  };

  // PDF URL builder
  const getPdfUrl = () => {
    const baseUrl = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production'
      ? 'https://fofenk.onrender.com/api'
      : 'http://localhost:5000/api');
    return `${baseUrl}/pdf/student-status-report/${studentId}?institutionId=${institution?._id}`;
  };

  // Handle PDF download
  const handlePdfDownload = () => {
    window.open(getPdfUrl(), '_blank');
    setPdfMenuAnchor(null);
    onClose();
  };

  // Handle PDF share to WhatsApp
  const handlePdfWhatsApp = async (selectedPhone = null) => {
    const student = studentData;
    if (!student) {
      alert('Öğrenci bilgisi bulunamadı');
      return;
    }

    let phoneToUse = selectedPhone;

    // If no phone selected, determine automatically
    if (!phoneToUse) {
      const notificationPhone = getNotificationPhone(student);
      const allPhones = getAllPhones(student);

      // If default notification recipient is set and phone exists, use it
      if (student.defaultNotificationRecipient && notificationPhone) {
        phoneToUse = notificationPhone;
      }
      // If only one phone available, use it
      else if (allPhones.length === 1) {
        phoneToUse = allPhones[0];
      }
      // If multiple phones and no default, ask user
      else if (allPhones.length > 1) {
        setAvailablePhones(allPhones);
        setPdfShareMode('whatsapp');
        setPhoneSelectOpen(true);
        setPdfMenuAnchor(null);
        return;
      }
      // No phone available
      else {
        alert('Kayıtlı telefon numarası bulunamadı');
        return;
      }
    }

    // Generate PDF and share
    setPdfGenerating(true);
    try {
      const response = await fetch(getPdfUrl());
      const blob = await response.blob();
      const fileName = `Durum_Raporu_${student.firstName}_${student.lastName}.pdf`;

      // Check if Web Share API is supported (mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const shareData = {
          files: [file],
          title: 'Öğrenci Durum Raporu',
          text: `Merhaba, ${student.firstName} ${student.lastName} öğrencisinin detaylı kurs kayıt ve ödeme bilgileri ektedir.\n\n${institution?.name || 'Fofora Tiyatro'}`,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          setPdfMenuAnchor(null);
          setPhoneSelectOpen(false);
          onClose();
          return;
        }
      }

      // Fallback: Download and open WhatsApp with message
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      // Open WhatsApp with message (user will attach the downloaded file)
      const message = `Merhaba, ${student.firstName} ${student.lastName} öğrencisinin detaylı kurs kayıt ve ödeme bilgileri ektedir.\n\n${institution?.name || 'Fofora Tiyatro'}`;
      sendWhatsAppMessage(phoneToUse.phone, message, {});

    } catch (error) {
      console.error('PDF share error:', error);
      alert('PDF oluşturulurken bir hata oluştu');
    } finally {
      setPdfGenerating(false);
      setPdfMenuAnchor(null);
      setPhoneSelectOpen(false);
      onClose();
    }
  };

  // Handle PDF share to Email
  const handlePdfEmail = () => {
    const student = studentData;
    if (!student) {
      alert('Öğrenci bilgisi bulunamadı');
      return;
    }

    // Download the PDF first
    const link = document.createElement('a');
    link.href = getPdfUrl();
    link.download = `Durum_Raporu_${student.firstName}_${student.lastName}.pdf`;
    link.target = '_blank';
    link.click();

    // Open mailto with subject and body (user will attach the file)
    const email = recipientData.email || student.email || '';
    const subject = `${student.firstName} ${student.lastName} - Kurs Kayıt ve Ödeme Bilgileri`;
    const body = `Merhaba,\n\n${student.firstName} ${student.lastName} öğrencisinin detaylı kurs kayıt ve ödeme bilgileri ekte sunulmuştur.\n\nSaygılarımızla,\n${institution?.name || 'Fofora Tiyatro'}`;

    if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    setPdfMenuAnchor(null);
    onClose();
  };

  // Handle phone selection
  const handlePhoneSelect = (phoneData) => {
    setPhoneSelectOpen(false);
    if (pdfShareMode === 'whatsapp') {
      handlePdfWhatsApp(phoneData);
    }
  };

  // Load templates from database
  useEffect(() => {
    if (open && institution) {
      loadTemplates();
    }
  }, [open, institution]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/message-templates', {
        params: { institution: institution._id },
      });
      setTemplates(response.data);
    } catch (error) {
      console.error('Error loading templates:', error);
      // Fall back to default templates
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Get template content (from DB or defaults)
  const getTemplateContent = (templateType) => {
    const dbTemplate = templates.find(t => t.type === templateType);
    if (dbTemplate) return dbTemplate.template;
    return DEFAULT_WHATSAPP_TEMPLATES[templateType] || DEFAULT_WHATSAPP_TEMPLATES.general;
  };

  // Send WhatsApp message with template
  const handleWhatsAppSend = (templateType) => {
    const { phone, name } = recipientData;

    if (!phone) {
      alert('Telefon numarası bulunamadı');
      onClose();
      return;
    }

    const template = getTemplateContent(templateType);
    const data = {
      ...templateData,
      recipientName: name || templateData.recipientName || '',
      studentName: templateData.studentName || name || '',
      institutionName: institution?.name || 'Kurum',
    };

    const message = replaceTemplateVariables(template, data);
    sendWhatsAppMessage(phone, message, {});
    onClose();
  };

  // Handle direct WhatsApp (empty message)
  const handleDirectWhatsApp = () => {
    const { phone } = recipientData;

    if (!phone) {
      alert('Telefon numarası bulunamadı');
      onClose();
      return;
    }

    sendWhatsAppMessage(phone, '', {});
    onClose();
  };

  // Handle email selection
  const handleEmailSelect = (templateType) => {
    if (!onEmailClick) {
      onClose();
      return;
    }

    const { email, name } = recipientData;

    if (!email) {
      alert('Email adresi bulunamadı');
      onClose();
      return;
    }

    const template = templateType ? getTemplateContent(templateType) : '';
    const data = {
      ...templateData,
      recipientName: name || templateData.recipientName || '',
      studentName: templateData.studentName || name || '',
      institutionName: institution?.name || 'Kurum',
    };

    const message = templateType ? replaceTemplateVariables(template, data) : '';
    const subject = templateType ? (TEMPLATE_TYPE_LABELS[templateType] || 'Bildirim') : '';

    onEmailClick(
      [{ email, name }],
      subject,
      message,
      data
    );
    onClose();
  };

  // Open template submenu
  const handleChannelClick = (event, channel) => {
    setSelectedChannel(channel);
    setSubMenuAnchor(event.currentTarget);
  };

  // Close submenu
  const handleSubMenuClose = () => {
    setSubMenuAnchor(null);
    setSelectedChannel(null);
  };

  // Handle template selection from submenu
  const handleTemplateSelect = (templateType) => {
    if (selectedChannel === 'whatsapp') {
      handleWhatsAppSend(templateType);
    } else if (selectedChannel === 'email') {
      handleEmailSelect(templateType);
    }
    handleSubMenuClose();
  };

  // If default template is provided, send directly
  const handleDefaultSend = (channel) => {
    if (defaultTemplate) {
      if (channel === 'whatsapp') {
        handleWhatsAppSend(defaultTemplate);
      } else if (channel === 'email') {
        handleEmailSelect(defaultTemplate);
      }
    }
  };

  // Filter templates based on pageContext and showOnPages
  const getFilteredTemplates = () => {
    // Filter templates from DB based on showOnPages
    const dbTemplatesForPage = templates.filter(t => {
      if (!t.showOnPages || t.showOnPages.length === 0) return true; // No restriction, show everywhere
      if (t.showOnPages.includes('allPages')) return true; // Show on all pages
      if (pageContext && t.showOnPages.includes(pageContext)) return true; // Show on this specific page
      return !pageContext; // If no pageContext provided, show all
    });

    // Get unique template types from filtered DB templates
    const dbTemplateTypes = dbTemplatesForPage.map(t => t.type);

    // Build available templates list
    const result = [
      { type: 'custom', label: 'Özel Mesaj (Boş)' },
    ];

    // Add templates that exist in DB and match the page context
    Object.entries(TEMPLATE_TYPE_LABELS).forEach(([type, label]) => {
      if (dbTemplateTypes.includes(type)) {
        result.push({ type, label });
      }
    });

    return result;
  };

  const availableTemplates = getFilteredTemplates();

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        {loading ? (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {/* WhatsApp Options */}
            {(mode === 'full' || mode === 'whatsapp') && (
              <>
                <MenuItem onClick={(e) => handleChannelClick(e, 'whatsapp')}>
                  <ListItemIcon>
                    <WhatsApp sx={{ color: '#25D366' }} />
                  </ListItemIcon>
                  <ListItemText primary="WhatsApp Gönder" />
                </MenuItem>

                {defaultTemplate && (
                  <MenuItem onClick={() => handleDefaultSend('whatsapp')} sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <Message fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={TEMPLATE_TYPE_LABELS[defaultTemplate] || 'Varsayılan Şablon'}
                      secondary="Hızlı gönder"
                    />
                  </MenuItem>
                )}
              </>
            )}

            {mode === 'full' && <Divider />}

            {/* Email Options */}
            {(mode === 'full' || mode === 'email') && recipientData.email && (
              <>
                <MenuItem onClick={(e) => handleChannelClick(e, 'email')}>
                  <ListItemIcon>
                    <Email color="info" />
                  </ListItemIcon>
                  <ListItemText primary="Email Gönder" />
                </MenuItem>

                {defaultTemplate && (
                  <MenuItem onClick={() => handleDefaultSend('email')} sx={{ pl: 4 }}>
                    <ListItemIcon>
                      <Message fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={TEMPLATE_TYPE_LABELS[defaultTemplate] || 'Varsayılan Şablon'}
                      secondary="Hızlı gönder"
                    />
                  </MenuItem>
                )}
              </>
            )}

            {!recipientData.email && (mode === 'full' || mode === 'email') && (
              <MenuItem disabled>
                <ListItemIcon>
                  <Email color="disabled" />
                </ListItemIcon>
                <ListItemText primary="Email yok" secondary="Email adresi kayıtlı değil" />
              </MenuItem>
            )}

            {/* Status Report Option for students page */}
            {pageContext === 'students' && studentId && (
              <>
                <Divider />
                <MenuItem
                  onClick={(e) => setPdfMenuAnchor(e.currentTarget)}
                  disabled={pdfGenerating}
                >
                  <ListItemIcon>
                    {pdfGenerating ? <CircularProgress size={20} /> : <Description color="secondary" />}
                  </ListItemIcon>
                  <ListItemText
                    primary="Son Durum Raporu"
                    secondary={pdfGenerating ? 'Oluşturuluyor...' : 'PDF oluştur ve paylaş'}
                  />
                </MenuItem>
              </>
            )}

            {/* Extra custom options */}
            {extraOptions.length > 0 && (
              <>
                <Divider />
                {extraOptions.map((option, idx) => (
                  <MenuItem key={idx} onClick={() => { option.onClick?.(); onClose(); }}>
                    {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}
                    <ListItemText primary={option.label} secondary={option.secondary} />
                  </MenuItem>
                ))}
              </>
            )}
          </>
        )}
      </Menu>

      {/* Template Selection Submenu */}
      <Menu
        anchorEl={subMenuAnchor}
        open={Boolean(subMenuAnchor)}
        onClose={handleSubMenuClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: 250, maxHeight: 400 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Şablon Seçin
        </Typography>
        <Divider />

        {availableTemplates.map(({ type, label }) => (
          <MenuItem
            key={type}
            onClick={() => type === 'custom'
              ? (selectedChannel === 'whatsapp' ? handleDirectWhatsApp() : handleEmailSelect(null))
              : handleTemplateSelect(type)
            }
          >
            <ListItemText primary={label} />
          </MenuItem>
        ))}
      </Menu>

      {/* PDF Share Options Submenu */}
      <Menu
        anchorEl={pdfMenuAnchor}
        open={Boolean(pdfMenuAnchor)}
        onClose={() => setPdfMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: 220 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          PDF İşlemleri
        </Typography>
        <Divider />
        <MenuItem onClick={handlePdfDownload}>
          <ListItemIcon>
            <Download color="primary" />
          </ListItemIcon>
          <ListItemText primary="İndir" />
        </MenuItem>
        <MenuItem onClick={() => handlePdfWhatsApp()}>
          <ListItemIcon>
            <WhatsApp sx={{ color: '#25D366' }} />
          </ListItemIcon>
          <ListItemText primary="WhatsApp'a Gönder" />
        </MenuItem>
        <MenuItem onClick={handlePdfEmail}>
          <ListItemIcon>
            <Email color="info" />
          </ListItemIcon>
          <ListItemText primary="Email'e Gönder" />
        </MenuItem>
      </Menu>

      {/* Phone Selection Dialog */}
      <Dialog
        open={phoneSelectOpen}
        onClose={() => setPhoneSelectOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone color="primary" />
            Telefon Numarası Seçin
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            PDF'i hangi numaraya göndermek istiyorsunuz?
          </Typography>
          <List>
            {availablePhones.map((phoneData, index) => (
              <ListItemButton
                key={index}
                onClick={() => handlePhoneSelect(phoneData)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                  <Person />
                </Avatar>
                <ListItemText
                  primary={phoneData.name}
                  secondary={
                    <Box component="span">
                      <Typography component="span" variant="body2" color="text.secondary">
                        {phoneData.type}
                      </Typography>
                      {' • '}
                      <Typography component="span" variant="body2" color="primary">
                        {phoneData.phone}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhoneSelectOpen(false)}>İptal</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationMenu;
