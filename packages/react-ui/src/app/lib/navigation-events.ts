import { useEffect } from 'react';

export function useLogoutEventListener() {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === 'logout_event') {
        sessionStorage.removeItem('last_visited_page');
        sessionStorage.setItem('logout_flag', 'true');
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
}
