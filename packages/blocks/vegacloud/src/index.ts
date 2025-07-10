import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { vegacloudAuth } from './lib/auth';
import { generateJwt } from './lib/common';

export const vegacloud = createBlock({
  displayName: 'Vega Cloud',
  auth: vegacloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/vegacloud.svg',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://api.vegacloud.io/vegaapi/',
      auth: vegacloudAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Vega Cloud API documentation](https://api.vegacloud.io/docs).',
        }),
      },
      authMapping: async (context: any) => {
        const { clientId, clientSecret, realm } = context.auth;
        const { access_token } = await generateJwt(
          clientId,
          clientSecret,
          realm,
        );

        return {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
  triggers: [],
});
