import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { finoutAuth } from './lib/auth';

export const finout = createBlock({
  displayName: 'Finout',
  auth: finoutAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/finout.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://app.finout.io/v1',
      auth: finoutAuth,
      authMapping: async ({ auth }: any) => ({
        'x-finout-client-id': auth.clientId,
        'x-finout-secret-key': auth.secretKey,
      }),
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Finout API documentation](https://docs.finout.io/configuration/finout-api).',
        }),
      },
    }),
  ],
  triggers: [],
});
