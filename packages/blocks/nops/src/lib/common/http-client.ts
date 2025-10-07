import { httpClient, HttpMethod, HttpResponse } from '@openops/blocks-common';
import { BASE_NOPS_URL } from './base-url';

export async function makeGetRequest(
  apiKey: string,
  path: string,
  queryParams?: Record<string, any>,
  extraHeaders?: Record<string, string>,
): Promise<HttpResponse> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: `${BASE_NOPS_URL}${path}`,
    headers: {
      'X-Nops-Api-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(extraHeaders ?? {}),
    },
    queryParams,
  });

  return response;
}

export async function makePostRequest<T = unknown>(
  apiKey: string,
  path: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const response = await httpClient.sendRequest<T>({
    method: HttpMethod.POST,
    url: `${BASE_NOPS_URL}${path}`,
    headers: {
      'X-Nops-Api-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(extraHeaders ?? {}),
    },
    body: body,
  });

  return response.body;
}
