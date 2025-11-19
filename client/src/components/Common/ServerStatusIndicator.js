import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { Circle } from '@mui/icons-material';

/**
 * Server status indicator with LED-style display
 * @param {string} status - 'online', 'offline', 'checking'
 * @param {Date} lastChecked - Last health check timestamp
 */
const ServerStatusIndicator = ({ status, lastChecked }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          color: '#4caf50', // Green
          label: 'Server Aktif',
          description: 'Backend servisi çalışıyor',
          glow: true
        };
      case 'offline':
        return {
          color: '#f44336', // Red
          label: 'Server Offline',
          description: 'Backend servisi erişilemiyor',
          glow: false
        };
      case 'checking':
        return {
          color: '#ff9800', // Orange
          label: 'Kontrol Ediliyor',
          description: 'Server durumu kontrol ediliyor...',
          glow: true
        };
      default:
        return {
          color: '#9e9e9e', // Gray
          label: 'Bilinmiyor',
          description: 'Durum bilinmiyor',
          glow: false
        };
    }
  };

  const config = getStatusConfig();

  const tooltipContent = (
    <Box>
      <Typography variant="body2" fontWeight="bold">
        {config.label}
      </Typography>
      <Typography variant="caption" display="block">
        {config.description}
      </Typography>
      {lastChecked && (
        <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
          Son kontrol: {lastChecked.toLocaleTimeString('tr-TR')}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
        Otomatik kontrol: Her 2 dakikada bir
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="right">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer'
        }}
      >
        {/* LED Indicator */}
        <Box
          sx={{
            position: 'relative',
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: config.color,
            boxShadow: config.glow ? `0 0 8px ${config.color}` : 'none',
            animation: status === 'checking' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': {
                opacity: 1,
                transform: 'scale(1)',
              },
              '50%': {
                opacity: 0.5,
                transform: 'scale(0.9)',
              },
            },
          }}
        >
          {/* Inner glow for online status */}
          {config.glow && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                height: '60%',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
              }}
            />
          )}
        </Box>
      </Box>
    </Tooltip>
  );
};

export default ServerStatusIndicator;
