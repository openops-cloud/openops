import { authenticationSession } from '@/app/lib/authentication-session';
import { InternalAxiosRequestConfig } from 'axios';

const unauthenticatedRoutes = [
  'api/v1/authentication/sign-in',
  'api/v1/authentication/sign-up',
  'api/v1/flags',
];

const isOriginUrl = (url: string): boolean =>
  url.startsWith(window.location.origin);

const needsAuthHeader = (url: string): boolean => {
  if (!isOriginUrl(url)) {
    return false;
  }

  return unauthenticatedRoutes.some((route) => url.startsWith(route));
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
