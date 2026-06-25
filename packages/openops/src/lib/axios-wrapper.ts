import { logger } from '@openops/server-shared';
import axios, { AxiosError, AxiosHeaders, Method } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';

function getRetryAxiosInstance(retryConfigs: IAxiosRetryConfig) {
  const retryAxiosInstance = axios.create();

  axiosRetry(retryAxiosInstance, retryConfigs);
  return retryAxiosInstance;
}

export async function makeHttpRequest<T>(
  method: Method,
  url: string,
  headers?: AxiosHeaders,
  body?: any,
  retryConfigs?: IAxiosRetryConfig,
): Promise<T> {
  const startTimeCode = performance.now();

  try {
    const config = {
      method,
      url,
      headers,
      data: body,
    };

    const axiosInstance = retryConfigs
      ? getRetryAxiosInstance(retryConfigs)
      : axios;

    const response = await axiosInstance.request(config);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    const logMessage = `Failed to execute HTTP request. Url: "${url}"`;
    const timeTaken = `${Math.floor(performance.now() - startTimeCode)}ms`;

    if (axiosError && axiosError.response?.data) {
      logger.warn(logMessage, {
        timeTaken,
        error: axiosError,
        status: axiosError.response?.status,
        errorResponse: axiosError.response?.data,
        statusText: axiosError.response?.statusText,
      });

      throw new Error(JSON.stringify(axiosError.response?.data));
    }

    logger.warn(logMessage, {
      error,
      timeTaken,
    });

    throw error;
  }
}
