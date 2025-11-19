import { useState, useEffect, useCallback } from 'react';
import api from '../api';

/**
 * Custom hook to monitor server health status
 * - Pings /api/health every 2 minutes
 * - Prevents Render.com free tier from sleeping
 * - Returns current server status: 'online', 'offline', 'checking'
 */
const useServerHealth = () => {
  const [status, setStatus] = useState('checking'); // 'online', 'offline', 'checking'
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const response = await api.get('/health', { timeout: 10000 }); // 10 second timeout

      if (response.status === 200 && response.data.status === 'OK') {
        setStatus('online');
        setLastChecked(new Date());
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('Server health check failed:', error.message);
      setStatus('offline');
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    // Initial check immediately
    checkHealth();

    // Then check every 2 minutes (120000ms)
    const intervalId = setInterval(checkHealth, 120000);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [checkHealth]);

  return {
    status,
    lastChecked,
    checkHealth // Allow manual refresh
  };
};

export default useServerHealth;
