import {
  AuthenticationType,
  httpClient,
  HttpMethod,
  HttpRequest,
} from '@openops/blocks-common';
import { logger } from '@openops/server-shared';

export async function makeRequest<T>(params: RequestParams): Promise<T> {
  const request = createHttpRequest(params);

  const response = await httpClient.sendRequest<T>(request);

  return response.body;
}

export async function makePaginatedRequest<T extends unknown[]>(
  params: RequestParams,
): Promise<T> {
  /**
   * Based on https://docs.gitlab.com/ee/api/index.html#pagination
   */
  let pagesRemaining = true;
  const data = [];
  let page = 1;

  const request = createHttpRequest(params);

  while (pagesRemaining) {
    request.queryParams = {
      ...params.queryParams,
      per_page: params.queryParams?.['per_page'] || '100',
      page: page.toString(),
    };

    const response = await httpClient.sendRequest<T>(request);

    data.push(...response.body);

    const totalPages = parseInt(response.headers?.['x-total-pages'] as string || '1');
    pagesRemaining = page < totalPages;
    page++;
  }

  return data as T;
}

function createHttpRequest(params: RequestParams): HttpRequest {
  const baseUrl = params.gitlabUrl || 'https://gitlab.com';
  
  return {
    method: params.httpMethod,
    url: `${baseUrl}/api/v4/${params.url}`,
    queryParams: params.queryParams,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: params.authProp,
    },
    body: params.body,
    headers: params.headers,
  };
}

interface RequestParams {
  url: string;
  httpMethod: HttpMethod;
  queryParams?: Record<string, string>;
  authProp: string;
  body?: any;
  headers?: any;
  gitlabUrl?: string;
}