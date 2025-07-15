import { httpClient, HttpMethod } from '@openops/blocks-common';
import { BASE_CH_URL } from './base-url';

export async function makeGetRequest<T = unknown>(
  apiKey: string,
  path: string,
): Promise<T[]> {
  const response = await httpClient.sendRequest<T[]>({
    method: HttpMethod.GET,
    url: `${BASE_CH_URL}${path}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  return response.body;
}
