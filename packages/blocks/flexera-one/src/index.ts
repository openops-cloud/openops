import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { parse } from 'tldts';
import { flexeraAuth } from './lib/auth';

export const flexera = createBlock({
  displayName: 'Flexera',
  auth: flexeraAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/flexera.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth: any) => auth.apiUrl,
      auth: flexeraAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Flexera API documentation](https://docs.flexera.com/flexera/EN/FlexeraAPI/GetStartedAPI.htm).',
        }),
      },
      authMapping: async ({ auth }: any) => {
        const { apiUrl, refreshToken } = auth;
        const accessToken = await generateAccessToken(refreshToken, apiUrl);

        return {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
  triggers: [],
});

async function generateAccessToken(
  refreshToken: string,
  apiUrl: string,
): Promise<string> {
  const domain = parse(apiUrl).domain;
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
