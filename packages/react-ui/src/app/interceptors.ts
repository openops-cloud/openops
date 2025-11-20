import { API_URL, isUrlRelative } from '@/app/lib/api';
import { authenticationSession } from '@/app/lib/authentication-session';
import axios, { AxiosError, HttpStatusCode } from 'axios';
import { OPENOPS_CLOUD_USER_INFO_API_URL } from './constants/cloud';
import { QueryKeys } from './constants/query-keys';
import { FlagsMap } from './lib/flags-api';
import { queryClient } from './lib/query-client';

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
  if (token && config.url && needsAuthHeader(config.url)) {
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
      const url = axiosError.request.responseURL;

      let isSignInRoute = false;
      if (url) {
        try {
          const parsedUrl = new URL(url, window.location.origin);
          isSignInRoute =
            parsedUrl.pathname === '/api/v1/authentication/sign-in';
        } catch (e) {
          console.warn('Failed to parse URL in 401 interceptor:', url, e);
          isSignInRoute = false;
        }
      }

      if (url !== OPENOPS_CLOUD_USER_INFO_API_URL && !isSignInRoute) {
        console.warn('JWT expired logging out');

        const flags = queryClient.getQueryData<FlagsMap>([QueryKeys.flags]);
        authenticationSession.logOut({
          userInitiated: false,
          federatedLoginUrl: flags?.FRONTEGG_URL as string | undefined,
        });
        if (!flags?.FRONTEGG_URL) {
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  },
);
