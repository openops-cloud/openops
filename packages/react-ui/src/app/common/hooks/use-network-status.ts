import { platformApi } from '@/app/lib/platforms-api';
import { useEffect, useState } from 'react';

type NetworkStatus = 'good' | 'slow' | 'disconnected';

const INTERVAL_TIME_MS = 10000;
const SLOW_THRESHOLD_MS = 1500;

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('good');

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function checkConnection() {
      if (!navigator.onLine) {
        setNetworkStatus('disconnected');
        return;
      }

      const start = performance.now();
      try {
        await platformApi.getPlatformMetadata();
        const duration = performance.now() - start;

        if (duration > SLOW_THRESHOLD_MS) setNetworkStatus('slow');
        else setNetworkStatus('good');
      } catch {
        setNetworkStatus('disconnected');
      }
    }

    const handleOffline = () => setNetworkStatus('disconnected');

    checkConnection();

    intervalId = setInterval(checkConnection, INTERVAL_TIME_MS);

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return networkStatus;
}
