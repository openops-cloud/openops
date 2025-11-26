import { API_URL, isUrlRelative } from '@/app/lib/api';
import { authenticationSession } from '@/app/lib/authentication-session';
import { InternalAxiosRequestConfig } from 'axios';

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
  const isLocalUrl = resolvedUrl.includes(API_URL);
  const isUnauthenticatedRoute = unauthenticatedRoutes.some((route) =>
    url.startsWith(route),
  );

  return !isUnauthenticatedRoute && isLocalUrl;
};

export function createRequestInterceptor(): (
  config: InternalAxiosRequestConfig,
) => InternalAxiosRequestConfig {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = authenticationSession.getToken();
    if (token && config.url && needsAuthHeader(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  };
}
