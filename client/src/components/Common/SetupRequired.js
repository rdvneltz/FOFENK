import React from 'react';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { Warning, Business, CalendarMonth } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SetupRequired = ({ type }) => {
  const navigate = useNavigate();

  const config = {
    institution: {
      icon: <Business sx={{ fontSize: 60, color: 'warning.main' }} />,
      title: 'Kurum Profili Bulunamadı',
      message: 'Sistemi kullanmaya başlamadan önce bir kurum profili oluşturmanız gerekmektedir.',
      buttonText: 'Kurum Profili Oluştur',
      buttonAction: () => navigate('/settings'),
    },
    season: {
      icon: <CalendarMonth sx={{ fontSize: 60, color: 'warning.main' }} />,
      title: 'Sezon Bulunamadı',
      message: 'İşlem yapmadan önce en az bir sezon oluşturmanız gerekmektedir.',
      buttonText: 'Sezon Oluştur',
      buttonAction: () => navigate('/seasons'),
    },
  };

  const currentConfig = config[type] || config.institution;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 500,
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: 3 }}>{currentConfig.icon}</Box>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          {currentConfig.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {currentConfig.message}
        </Typography>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Bu sayfayı kullanabilmek için önce gerekli kurulumu tamamlayın.
        </Alert>
        <Button
          variant="contained"
          size="large"
          onClick={currentConfig.buttonAction}
          startIcon={currentConfig.icon}
        >
          {currentConfig.buttonText}
        </Button>
      </Paper>
    </Box>
  );
};

export default SetupRequired;
