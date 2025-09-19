import { httpClient, HttpMethod, HttpResponse } from '@openops/blocks-common';
import { BASE_CH_URL } from './base-url';

export async function makeGetRequest(
  apiKey: string,
  path: string,
  queryParams?: Record<string, string>,
): Promise<HttpResponse> {
  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: `${BASE_CH_URL}${path}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    queryParams,
  });
  return response;
}

export async function makePostRequest<T = unknown>(
  apiKey: string,
  path: string,
  body: unknown,
): Promise<T> {
  const response = await httpClient.sendRequest<T>({
    method: HttpMethod.POST,
    url: `${BASE_CH_URL}${path}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body,
  });
  return response.body;
}
