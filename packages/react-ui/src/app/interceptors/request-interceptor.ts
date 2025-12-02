import { authenticationSession } from '@/app/lib/authentication-session';
import { InternalAxiosRequestConfig } from 'axios';
import { isUrlRelative } from '../lib/api';

const needsAuthHeader = (url: string): boolean => {
  return isUrlRelative(url);
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
