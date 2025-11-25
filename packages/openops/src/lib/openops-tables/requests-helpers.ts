/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AxiosError, AxiosHeaders, AxiosResponse, Method } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import { StatusCodes } from 'http-status-codes';
import { makeHttpRequest } from '../axios-wrapper';

const RETRY_DELAY_MS = 1000;

const getStatusText = (statusCode: number): string => {
  const statusEntry = Object.entries(StatusCodes).find(
    ([_, value]) => value === statusCode,
  );
  if (!statusEntry) {
    return `${statusCode}`;
  }

  const statusKey = statusEntry[0];
  const statusText = statusKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return `${statusCode} ${statusText}`;
};

export const axiosTablesRetryConfig: IAxiosRetryConfig = {
  retries: 3,
  retryDelay: (retryCount: number, error: AxiosError) => {
    const statusText = error?.response?.status
      ? getStatusText(error.response.status)
      : 'unknown status';
    logger.debug(
      `The request failed with status ${statusText}. Request count: ${retryCount}`,
    );
    return retryCount * RETRY_DELAY_MS;
  },
  retryCondition: (error: AxiosError) => {
    return (
      (error?.response?.status &&
        [StatusCodes.BAD_GATEWAY, StatusCodes.CONFLICT].includes(
          error.response.status,
        )) ||
      false
    );
  },
};

export async function makeOpenOpsTablesPost<T>(
  route: string,
  body: any,
  headers?: AxiosHeaders,
  retryConfigs?: IAxiosRetryConfig,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>(
    'POST',
    route,
    body,
    headers,
    undefined,
    retryConfigs,
  );
}

export async function makeOpenOpsTablesDelete<T>(
  route: string,
  headers?: AxiosHeaders,
  retryConfigs?: IAxiosRetryConfig,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>(
    'DELETE',
    route,
    undefined,
    headers,
    undefined,
    retryConfigs,
  );
}

export async function makeOpenOpsTablesPatch<T>(
  route: string,
  body: any,
  headers?: AxiosHeaders,
  retryConfigs?: IAxiosRetryConfig,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>(
    'PATCH',
    route,
    body,
    headers,
    undefined,
    retryConfigs,
  );
}

export async function makeOpenOpsTablesPut<T>(
  route: string,
  body: any,
  headers?: AxiosHeaders,
  retryConfigs?: IAxiosRetryConfig,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>(
    'PUT',
    route,
    body,
    headers,
    undefined,
    retryConfigs,
  );
}

export async function makeOpenOpsTablesGet<T>(
  route: string,
  headers?: AxiosHeaders,
  retryConfigs?: IAxiosRetryConfig,
): Promise<T[]> {
  const responses: T[] = [];
  let url;

  do {
    const response: any = await makeOpenOpsTablesRequest<AxiosResponse>(
      'GET',
      route,
      undefined,
      headers,
      url,
      retryConfigs,
    );

    if (!response) {
      break;
    }

    responses.push(response);

    if ('next' in response && response.next) {
      url = response.next;
    } else {
      break;
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);

  return responses;
}

export async function makeOpenOpsTablesRequest<T>(
  method: Method,
  route: string,
  body?: any,
  headers?: AxiosHeaders,
  url?: string,
  retryConfigs = axiosTablesRetryConfig,
): Promise<T> {
  const baseUrl = system.get(AppSystemProp.OPENOPS_TABLES_API_URL);

  return await makeHttpRequest(
    method,
    url ?? `${baseUrl}/openops-tables/${route}`,
    headers,
    body,
    retryConfigs,
  );
}
