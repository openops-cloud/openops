import { httpClient, HttpMethod } from '@openops/blocks-common';

export const BASE_URL = 'https://api.vantage.sh/v2';

export async function makeRequest({
  auth,
  endpoint,
  method,
  queryParams,
  body,
}: {
  auth: string;
  endpoint: string;
  method: HttpMethod;
  queryParams?: Record<string, string>;
  body?: any;
}) {
  const response = await httpClient.sendRequest({
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      Authorization: `Bearer ${auth}`,
    },
    body,
    queryParams,
  });

  const result = response.body;

  return result;
}
