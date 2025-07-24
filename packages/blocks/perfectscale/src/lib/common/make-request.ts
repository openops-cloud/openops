import { httpClient, HttpMethod } from '@openops/blocks-common';
import { makeHttpRequest } from '@openops/common';

export const BASE_URL = 'https://api.app.perfectscale.io/public/v1/';

export async function makeRequest({
  auth,
  url,
  method = HttpMethod.GET,
  headers,
  body,
}: {
  auth: { clientId: string; clientSecret: string };
  url: string;
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
}): Promise<any> {
  const accessToken = await generateAccessToken({
    clientSecret: auth.clientSecret,
    clientId: auth.clientId,
  });

  headers = {
    ...(headers ?? {}),
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await httpClient.sendRequest({
    method,
    url: `${BASE_URL}${url}`,
    headers,
    body,
  });

  const result = response.body;

  return result;
}

export async function generateAccessToken({
  clientSecret,
  clientId,
}: {
  clientSecret: string;
  clientId: string;
}) {
  const url = `${BASE_URL}auth/public_auth`;

  const body = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
  });

  const result = await makeHttpRequest<any>('POST', url, undefined, body);

  if (!result || !result.data || !result.data.access_token) {
    throw new Error('Failed to generate access token from PerfectScale');
  }

  return result.data.access_token;
}
