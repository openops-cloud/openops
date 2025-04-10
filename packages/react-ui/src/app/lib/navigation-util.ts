const LAST_VISITED_KEY = 'last_visited_page';

export const navigationUtil = {
  save: (path: string) => {
    const authPages = [
      '/sign-in',
      '/sign-up',
      '/forget-password',
      '/reset-password',
      '/verify-email',
    ];
    if (!authPages.includes(path)) {
      localStorage.setItem(LAST_VISITED_KEY, path);
    }
  },

  get: () => {
    return localStorage.getItem(LAST_VISITED_KEY) ?? '/';
  },

  clear: () => {
    localStorage.removeItem(LAST_VISITED_KEY);
  },
};
