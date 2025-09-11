import { API_BASE_URL } from '@openops/ui-kit';
import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  isAxiosError,
} from 'axios';
import qs from 'qs';

export const API_URL = `${API_BASE_URL}/api`;

export function isUrlRelative(url: string) {
  return !url.startsWith('http') && !url.startsWith('https');
}

function request<TResponse>(
  url: string,
  config: AxiosRequestConfig = {},
): Promise<TResponse> {
  const resolvedUrl = !isUrlRelative(url) ? url : `${API_URL}${url}`;

  return axios({
    url: resolvedUrl,
    ...config,
    headers: {
      ...config.headers,
    },
  }).then((response) => response.data as TResponse);
}

export type HttpError = AxiosError<unknown, AxiosResponse<unknown>>;

export const api = {
  isError(error: unknown): error is HttpError {
    return isAxiosError(error);
  },
  get: <TResponse>(
    url: string,
    query?: unknown,
    config: AxiosRequestConfig = {},
  ) =>
    request<TResponse>(url, {
      params: query,
      paramsSerializer: (params) => {
        return qs.stringify(params, {
          arrayFormat: 'repeat',
        });
      },
      ...config,
    }),
  delete: <TResponse>(url: string, query?: Record<string, string>) =>
    request<TResponse>(url, {
      method: 'DELETE',
      params: query,
      paramsSerializer: (params) => {
        return qs.stringify(params, {
          arrayFormat: 'repeat',
        });
      },
    }),
  post: <TResponse, TBody = unknown, TParams = unknown>(
    url: string,
    body?: TBody,
    params?: TParams,
  ) =>
    request<TResponse>(url, {
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' },
      params: params,
    }),

  put: <TResponse, TBody = unknown, TParams = unknown>(
    url: string,
    body?: TBody,
    params?: TParams,
    headers: Record<string, string> = {},
  ) =>
    request<TResponse>(url, {
      method: 'PUT',
      data: body,
      headers: { 'Content-Type': 'application/json', ...headers },
      params: params,
    }),

  patch: <TResponse, TBody = unknown, TParams = unknown>(
    url: string,
    body?: TBody,
    params?: TParams,
  ) =>
    request<TResponse>(url, {
      method: 'PATCH',
      data: body,
      headers: { 'Content-Type': 'application/json' },
      params: params,
    }),
};
