import {
  createRetryConfig,
  httpClient,
  HttpMethod,
} from '@openops/blocks-common';
import { isRetryableError } from 'axios-retry';

const getRequestRetryConfig = createRetryConfig();
const accessTokenRetryConfig = createRetryConfig({
  retryCondition: (error) =>
    error.response?.status === 429 || isRetryableError(error),
});

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

  const finalHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    ...headers,
  };

  const response = await httpClient.sendRequest<T>(
    {
      method: HttpMethod.GET,
      url,
      headers: finalHeaders,
    },
    getRequestRetryConfig,
  );

  return response.body;
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

  const response = await httpClient.sendRequest<{ access_token: string }>(
    {
      method: HttpMethod.POST,
      url,
      body,
    },
    accessTokenRetryConfig,
  );

  return response.body.access_token;
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
