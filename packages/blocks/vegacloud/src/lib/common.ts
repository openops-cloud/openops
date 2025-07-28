import { httpClient, HttpMethod } from '@openops/blocks-common';
import { AxiosHeaders } from 'axios';
import { VegaCloudAuth } from './auth';

export async function generateJwt(
  auth: VegaCloudAuth,
): Promise<{ access_token: string }> {
  const url = `https://auth.vegacloud.io/realms/${auth.realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
  });

  const headers = new AxiosHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  const result = await httpClient.sendRequest<{ access_token: string }>({
    method: HttpMethod.POST,
    url,
    headers,
    body: body.toString(),
  });

  return result.body;
}

export async function makeRequest({
  auth,
  url,
  method,
  queryParams,
  body,
}: {
  auth: VegaCloudAuth;
  url: string;
  method: HttpMethod;
  queryParams?: Record<string, string>;
  body?: any;
}): Promise<any> {
  const token = await generateJwt(auth);

  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token.access_token}`,
  });

  const result = await httpClient.sendRequest({
    method,
    url,
    headers,
    queryParams,
    body,
  });

  return result.body;
}
