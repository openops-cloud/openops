import { httpClient, HttpMethod } from '@openops/blocks-common';
import { CloudfixAuth } from './auth';

export async function makeRequest({
  auth,
  endpoint,
  method,
  queryParams,
  body,
}: {
  auth: CloudfixAuth;
  endpoint: string;
  method: HttpMethod;
  queryParams?: Record<string, string>;
  body?: any;
}) {
  const { apiToken } = auth;

  const response = await httpClient.sendRequest({
    method,
    url: `${auth.apiUrl}${endpoint}`,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    body,
    queryParams,
  });

  const result = response.body;

  return result;
}
