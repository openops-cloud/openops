import { AppSystemProp, logger, system } from '@openops/server-shared';
import axios, { AxiosHeaders, Method } from 'axios';

export function createAxiosHeadersForAnalytics(token: string): AxiosHeaders {
  return new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });
}

export async function makeOpenOpsAnalyticsPost<T>(
  route: string,
  body: unknown,
  headers?: AxiosHeaders,
  allowErrors?: boolean,
): Promise<T> {
  return makeOpenOpsAnalyticsV1ApiRequest<T>(
    'POST',
    route,
    body,
    headers,
    allowErrors,
  );
}

export async function makeOpenOpsAnalyticsGet<T>(
  route: string,
  headers?: AxiosHeaders,
  allowErrors?: boolean,
): Promise<T> {
  return makeOpenOpsAnalyticsV1ApiRequest<T>(
    'GET',
    route,
    undefined,
    headers,
    allowErrors,
  );
}

export async function makeOpenOpsAnalyticsDelete<T>(
  route: string,
  headers?: AxiosHeaders,
  allowErrors?: boolean,
): Promise<T> {
  return makeOpenOpsAnalyticsV1ApiRequest<T>(
    'DELETE',
    route,
    undefined,
    headers,
    allowErrors,
  );
}

async function makeOpenOpsAnalyticsV1ApiRequest<T>(
  method: Method,
  route: string,
  body?: unknown,
  headers?: AxiosHeaders,
  allowErrors?: boolean,
): Promise<T> {
  const baseUrl =
    system.get(AppSystemProp.ANALYTICS_PRIVATE_URL) + '/openops-analytics';
  try {
    const response = await axios({
      method,
      url: `${baseUrl}/api/v1/${route}`,
      data: body,
      headers,
    });

    return response.data;
  } catch (error) {
    if (!allowErrors) {
      logger.error(`Error calling OpenOps Analytics. Route: "${route}"`, {
        error,
        route,
      });
    }

    throw error;
  }
}
