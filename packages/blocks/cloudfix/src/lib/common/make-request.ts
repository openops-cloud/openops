import { httpClient, HttpMethod } from '@openops/blocks-common';
import qs from 'qs';
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
  queryParams?: Record<string, string | string[] | number | boolean>;
  body?: any;
}) {
  const { apiKey } = auth;

  let url = `${auth.apiUrl}${endpoint}`;

  if (queryParams && Object.keys(queryParams).length > 0) {
    const queryString = qs.stringify(queryParams, { arrayFormat: 'repeat' });
    url += `?${queryString}`;
  }

  const response = await httpClient.sendRequest({
    method,
    url,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  const result = response.body;

  return result;
}
