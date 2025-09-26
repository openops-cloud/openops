import { useEffect } from 'react';
import {
  LAST_VISITED_KEY,
  LOGOUT_EVENT_KEY,
  LOGOUT_FLAG_KEY,
} from './navigation-constants';

export function useLogoutEventListener() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === LOGOUT_EVENT_KEY) {
        sessionStorage.removeItem(LAST_VISITED_KEY);
        sessionStorage.setItem(LOGOUT_FLAG_KEY, 'true');
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
}
