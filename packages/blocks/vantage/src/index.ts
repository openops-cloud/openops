import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { vantageAuth } from './lib/auth';

export const vantage = createBlock({
  displayName: 'Vantage',
  auth: vantageAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/vantage.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://api.vantage.sh/',
      auth: vantageAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Vantage API documentation](https://vantage.readme.io/reference/general).',
        }),
      },
      authMapping: async (context) => ({
        Authorization: 'Bearer ' + context.auth,
        Accept: 'application/json',
      }),
    }),
  ],
  triggers: [],
});
