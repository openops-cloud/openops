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
    const logMessage = `Error making HTTP request. Url: "${url}"`;

    if (axiosError && axiosError.response?.data) {
      logger.error(logMessage, {
        ...axiosError.response?.data,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
      });

      throw new Error(JSON.stringify(axiosError.response?.data));
    }

    logger.error(logMessage, error);
    throw error;
  }
}
