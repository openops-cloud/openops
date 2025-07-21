import { httpClient, HttpMethod } from '@openops/blocks-common';
import { FinOutAuth } from '../auth';

export const BASE_URL = 'https://app.finout.io/v1/';

export async function makeRequest({
  auth,
  endpoint,
  method,
  queryParams,
  body,
}: {
  auth: FinOutAuth;
  endpoint: string;
  method: HttpMethod;
  queryParams?: Record<string, string>;
  body?: any;
}) {
  const response = await httpClient.sendRequest({
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'x-finout-client-id': auth.clientId,
      'x-finout-secret-key': auth.secretKey,
    },
    body,
    queryParams,
  });

  const result = response.body;

  return result;
}
