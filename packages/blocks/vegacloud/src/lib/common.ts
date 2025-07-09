import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';

export function generateJwt(
  clientId: any,
  clientSecret: any,
  realm: any,
): Promise<{ access_token: string }> {
  const url = `https://auth.vegacloud.io/realms/${realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const headers = new AxiosHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  return makeHttpRequest<{ access_token: string }>(
    'POST',
    url,
    headers,
    body.toString(),
  );
}
