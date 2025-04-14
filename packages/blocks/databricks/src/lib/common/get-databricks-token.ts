import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';

export async function getDatabricksToken({
  accountId,
  clientId,
  clientSecret,
}: {
  accountId: string;
  clientId: string;
  clientSecret: string;
}) {
  const headers = new AxiosHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64',
  );
  headers.set('Authorization', `Basic ${credentials}`);

  const body = 'grant_type=client_credentials&scope=all-apis';

  const authUrl = `https://accounts.cloud.databricks.com/oidc/accounts/${accountId}/v1/token`;

  const response = await makeHttpRequest<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }>('POST', authUrl, headers, body);

  return response.access_token;
}
