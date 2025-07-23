import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { makeHttpRequest } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { PerfectScaleAuth, perfectscaleAuth } from './lib/auth';

const BASE_URL = 'https://api.app.perfectscale.io/public/v1/';

export const perfectscale = createBlock({
  displayName: 'PerfectScale',
  auth: perfectscaleAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/perfectscale.jpeg',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => BASE_URL,
      auth: perfectscaleAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [PerfectScale API documentation](https://docs.perfectscale.io/public-api#endpoints).',
        }),
      },
      authMapping: async ({ auth }) => {
        const accessToken = await generateAccessToken({
          clientSecret: (auth as PerfectScaleAuth).clientSecret,
          clientId: (auth as PerfectScaleAuth).clientId,
        });

        return {
          Authorization: `Bearer ${accessToken}`,
        };
      },
    }),
  ],
  triggers: [],
});

async function generateAccessToken({
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
