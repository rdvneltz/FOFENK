import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Fade,
} from '@mui/material';
import { TheaterComedy } from '@mui/icons-material';
import api from '../../api';

const loadingMessages = [
  'Sistem başlatılıyor...',
  'Sunucu uyandırılıyor...',
  'Veritabanı bağlantısı kuruluyor...',
  'Neredeyse hazır...',
  'Son kontroller yapılıyor...',
];

const StartupScreen = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let checkInterval;
    let messageInterval;
    let progressInterval;

    const checkBackend = async () => {
      try {
        const response = await api.get('/health', { timeout: 5000 });
        if (isMounted && response.data?.status) {
          // Backend is ready
          setProgress(100);
          setTimeout(() => {
            if (isMounted) setIsReady(true);
          }, 500);
          clearInterval(checkInterval);
          clearInterval(messageInterval);
          clearInterval(progressInterval);
        }
      } catch (error) {
        if (isMounted) {
          setCheckCount(prev => prev + 1);
        }
      }
    };

    // Initial check
    checkBackend();

    // Keep checking every 3 seconds
    checkInterval = setInterval(checkBackend, 3000);

    // Rotate messages every 4 seconds
    messageInterval = setInterval(() => {
      if (isMounted) {
        setMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }
    }, 4000);

    // Simulate progress (but cap at 90% until actually ready)
    progressInterval = setInterval(() => {
      if (isMounted) {
        setProgress(prev => {
          if (prev >= 90) return 90;
          return prev + Math.random() * 10;
        });
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(checkInterval);
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  if (isReady) {
    return children;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
        padding: 3,
      }}
    >
      <Fade in timeout={800}>
        <Paper
          elevation={10}
          sx={{
            p: 5,
            borderRadius: 4,
            textAlign: 'center',
            maxWidth: 450,
            width: '100%',
            background: 'rgba(255,255,255,0.95)',
          }}
        >
          {/* Logo / Icon */}
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(26, 35, 126, 0.4)' },
                '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(26, 35, 126, 0)' },
                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(26, 35, 126, 0)' },
              },
            }}
          >
            <TheaterComedy sx={{ fontSize: 50, color: 'white' }} />
          </Box>

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#1a237e',
              mb: 1,
            }}
          >
            FOFORA
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              color: '#546e7a',
              mb: 4,
            }}
          >
            Tiyatro & Kurs Yönetim Sistemi
          </Typography>

          {/* Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e3f2fd',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #1a237e 0%, #0d47a1 100%)',
                },
              }}
            />
          </Box>

          {/* Loading Message */}
          <Fade in key={messageIndex} timeout={500}>
            <Typography
              variant="body1"
              sx={{
                color: '#37474f',
                fontWeight: 500,
                minHeight: 28,
              }}
            >
              {loadingMessages[messageIndex]}
            </Typography>
          </Fade>

          {/* Info Text */}
          {checkCount > 2 && (
            <Fade in timeout={500}>
              <Typography
                variant="body2"
                sx={{
                  color: '#78909c',
                  mt: 3,
                  fontSize: '0.85rem',
                }}
              >
                Sunucu uyku modundan uyanıyor, bu işlem 30-60 saniye sürebilir...
              </Typography>
            </Fade>
          )}

          {checkCount > 5 && (
            <Fade in timeout={500}>
              <Typography
                variant="body2"
                sx={{
                  color: '#90a4ae',
                  mt: 1,
                  fontSize: '0.8rem',
                }}
              >
                İlk açılış biraz zaman alabilir, lütfen bekleyin.
              </Typography>
            </Fade>
          )}
        </Paper>
      </Fade>

      {/* Footer */}
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.7)',
          mt: 4,
        }}
      >
        © {new Date().getFullYear()} FOFORA Theatre Management
      </Typography>
    </Box>
  );
};

export default StartupScreen;
