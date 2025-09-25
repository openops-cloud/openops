import { useEffect } from 'react';
import { LAST_VISITED_KEY } from './navigation-util';

export const LOGOUT_EVENT_KEY = 'logout_event';
export const LOGOUT_FLAG_KEY = 'logout_flag';

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
