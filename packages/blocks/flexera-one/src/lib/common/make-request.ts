import { makeHttpRequest } from '@openops/common';
import { AxiosHeaders } from 'axios';

export async function makeGetRequest<T>({
  refreshToken,
  appRegion,
  url,
  headers,
}: {
  refreshToken: string;
  appRegion: string;
  url: string;
  headers?: Record<string, string>;
}): Promise<T> {
  const accessToken = await generateAccessToken({
    refreshToken,
    appRegion,
  });

  const finalHeaders = new AxiosHeaders({
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  });

  return await makeHttpRequest<T>('GET', url, finalHeaders);
}

export async function generateAccessToken({
  refreshToken,
  appRegion,
}: {
  refreshToken: string;
  appRegion: string;
}): Promise<string> {
  const domain = getDomain(appRegion);
  const url = `https://login.${domain}/oidc/token`;

  const body = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  };

  const result = await makeHttpRequest<{ access_token: string }>(
    'POST',
    url,
    undefined,
    body,
  );

  return result.access_token;
}

// https://docs.flexera.com/flexera/EN/FlexeraAPI/GenerateAccessToken.htm#gettingstarted_850488088_1116484
function getDomain(region: string): string {
  switch (region) {
    case 'us':
      return 'flexera.com';
    case 'eu':
      return 'flexera.eu';
    case 'apac':
      return 'flexera.au';
    default:
      throw new Error(`Unsupported region: ${region}`);
  }
}
