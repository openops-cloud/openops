import { InternalAxiosRequestConfig } from 'axios';

export function createRequestInterceptor(): (
  config: InternalAxiosRequestConfig,
) => InternalAxiosRequestConfig {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    return config;
  };
}
