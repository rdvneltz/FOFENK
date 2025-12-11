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
} from '@mui/material';
import { WhatsApp, Email, Message } from '@mui/icons-material';
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
 * - allowedTemplates: Array of template types to show (if not provided, shows 'general' only for student context)
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
  allowedTemplates = ['general'], // Default to only general template
}) => {
  const { institution } = useApp();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subMenuAnchor, setSubMenuAnchor] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null); // 'whatsapp' or 'email'

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

  // Available templates for display (filtered by allowedTemplates)
  const availableTemplates = [
    { type: 'custom', label: 'Özel Mesaj (Boş)' },
    ...Object.entries(TEMPLATE_TYPE_LABELS)
      .filter(([type]) => allowedTemplates.includes(type))
      .map(([type, label]) => ({ type, label })),
  ];

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
    </>
  );
};

export default NotificationMenu;
