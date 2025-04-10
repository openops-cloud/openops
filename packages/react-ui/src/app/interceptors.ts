import { API_URL, isUrlRelative } from '@/app/lib/api';
import { authenticationSession } from '@/app/lib/authentication-session';
import axios, { AxiosError, HttpStatusCode } from 'axios';
import { OPENOPS_CLOUD_USER_INFO_API_URL } from './constants/cloud';

const unauthenticatedRoutes = [
  '/v1/authentication/sign-in',
  '/v1/authentication/sign-up',
  '/v1/authn/local/verify-email',
  '/v1/flags',
  '/v1/forms/',
  '/v1/user-invitations/accept',
];

const needsAuthHeader = (url: string): boolean => {
  const resolvedUrl = !isUrlRelative(url) ? url : `${API_URL}${url}`;
  const isLocalUrl = resolvedUrl.startsWith(API_URL);
  const isUnauthenticatedRoute = unauthenticatedRoutes.some((route) =>
    url.startsWith(route),
  );

  return !isUnauthenticatedRoute && isLocalUrl;
};

// Add request interceptor to append Authorization header
axios.interceptors.request.use((config) => {
  const token = authenticationSession.getToken();
  if (token && needsAuthHeader(config.url!)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add global error handler for 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === HttpStatusCode.Unauthorized
    ) {
      const axiosError = error as AxiosError;

      if (axiosError.request.responseURL !== OPENOPS_CLOUD_USER_INFO_API_URL) {
        console.warn('JWT expired logging out');
        authenticationSession.logOut({
          userInitiated: false,
        });
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);
