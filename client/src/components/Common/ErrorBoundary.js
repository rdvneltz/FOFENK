import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { Refresh, Home, BugReport } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Check if this might be a cache/chunk loading error
    const isChunkError = error?.message?.includes('Loading chunk') ||
                         error?.message?.includes('ChunkLoadError') ||
                         error?.message?.includes('Failed to fetch dynamically imported module');

    if (isChunkError && this.state.retryCount < 2) {
      // Clear cache and reload for chunk errors
      this.handleClearCacheAndReload();
    }
  }

  handleClearCacheAndReload = () => {
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Clear localStorage app version to force refresh
    localStorage.removeItem('appVersion');
    localStorage.removeItem('lastVersionCheck');

    // Force reload from server (bypass cache)
    window.location.reload(true);
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Loading chunk') ||
                          this.state.error?.message?.includes('ChunkLoadError') ||
                          this.state.error?.message?.includes('Failed to fetch');

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            bgcolor: 'grey.100',
            p: 3
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <BugReport sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />

            <Typography variant="h5" gutterBottom color="error">
              Bir Hata Oluştu
            </Typography>

            {isChunkError ? (
              <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
                Uygulama güncellemesi algılandı. Sayfa yenileniyor...
              </Alert>
            ) : (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
              </Typography>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleClearCacheAndReload}
                color="primary"
              >
                Sayfayı Yenile
              </Button>

              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
              >
                Ana Sayfa
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              Sorun devam ederse tarayıcı önbelleğini temizleyin (Ctrl+Shift+Delete)
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
