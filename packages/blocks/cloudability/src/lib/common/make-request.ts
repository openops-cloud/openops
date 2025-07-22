import { httpClient, HttpMethod } from '@openops/blocks-common';
import { CloudabilityAuth } from '../auth';

export async function makeRequest({
  auth,
  endpoint,
  method,
  queryParams,
  body,
}: {
  auth: CloudabilityAuth;
  endpoint: string;
  method: HttpMethod;
  queryParams?: Record<string, string>;
  body?: any;
}) {
  const { apiKey } = auth;
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');

  const response = await httpClient.sendRequest({
    method,
    url: `${auth.apiUrl}${endpoint}`,
    headers: {
      Authorization: `Basic ${encoded}`,
    },
    body,
    queryParams,
  });

  const result = response.body;

  return result;
}
