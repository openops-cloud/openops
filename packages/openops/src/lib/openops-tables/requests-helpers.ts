import { AppSystemProp, system } from '@openops/server-shared';
import { AxiosError, AxiosHeaders, AxiosResponse, Method } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import { StatusCodes } from 'http-status-codes';
import { makeHttpRequest } from '../axios-wrapper';

export function createAxiosHeaders(token: string): AxiosHeaders {
  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `JWT ${token}`,
  });
}

export const axiosTablesSeedRetryConfig: IAxiosRetryConfig = {
  retries: 3,
  retryDelay: (retryCount: number) => {
    return retryCount * 1000;
  },
  retryCondition: (error: AxiosError) => {
    return (
      (error?.response?.status &&
        error?.response?.status === StatusCodes.CONFLICT) ||
      false
    );
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function makeOpenOpsTablesRequest<T>(
  method: Method,
  route: string,
  body?: any,
  headers?: AxiosHeaders,
  url?: string,
  retryConfigs?: IAxiosRetryConfig,
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
