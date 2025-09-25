import { LOGOUT_FLAG_KEY } from './navigation-events';

export const LAST_VISITED_KEY = 'last_visited_page';

export const navigationUtil = {
  save: (path: string) => {
    const authPages = [
      '/sign-in',
      '/sign-up',
      '/forget-password',
      '/reset-password',
      '/verify-email',
    ];
    if (
      !authPages.includes(path) &&
      sessionStorage.getItem(LOGOUT_FLAG_KEY) !== 'true'
    ) {
      sessionStorage.setItem(LAST_VISITED_KEY, path);
    }
  },

  get: () => {
    return sessionStorage.getItem(LAST_VISITED_KEY) ?? '/';
  },

  clear: () => {
    sessionStorage.removeItem(LAST_VISITED_KEY);
    sessionStorage.removeItem(LOGOUT_FLAG_KEY);
  },
};
