import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AxiosHeaders, AxiosResponse, Method } from 'axios';
import { makeHttpRequest } from '../axios-wrapper';

export function createAxiosHeaders(token: string): AxiosHeaders {
  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `JWT ${token}`,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function makeOpenOpsTablesPost<T>(
  route: string,
  body: any,
  headers?: AxiosHeaders,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>('POST', route, body, headers);
}

export async function makeOpenOpsTablesDelete<T>(
  route: string,
  headers?: AxiosHeaders,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>('DELETE', route, undefined, headers);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function makeOpenOpsTablesPatch<T>(
  route: string,
  body: any,
  headers?: AxiosHeaders,
): Promise<T> {
  return makeOpenOpsTablesRequest<T>('PATCH', route, body, headers);
}

export async function makeOpenOpsTablesGet<T>(
  route: string,
  headers?: AxiosHeaders,
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
): Promise<T> {
  const startTime = performance.now();

  const baseUrl = system.get(AppSystemProp.OPENOPS_TABLES_API_URL);

  const response = await makeHttpRequest<T>(
    method,
    url ?? `${baseUrl}/openops-tables/${route}`,
    headers,
    body,
  );

  const endTime = performance.now();

  logger.info(`Tables request took ${(endTime - startTime).toFixed(2)} ms`, {
    route: url ?? `${baseUrl}/openops-tables/${route}`,
    method,
  });

  return response;
}
