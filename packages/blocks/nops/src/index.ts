import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { nopsAuth } from './lib/auth';

export const nops = createBlock({
  displayName: 'nOps',
  description: 'Cloud cost optimization and FinOps platform',
  auth: nopsAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/nops.png',
  authors: ['nOps'],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://app.nops.io',
      auth: nopsAuth,
      authMapping: async ({ auth }) => {
        if (!auth || typeof auth !== 'string') {
          throw new Error(
            'nOps API Key is required. Please configure your nOps connection with a valid API key.',
          );
        }
        return {
          'X-Nops-Api-Key': auth,
          'Content-Type': 'application/json',
        };
      },
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [nOps Developer API documentation](https://help.nops.io/docs/nops/getting-started).',
        }),
      },
      description: 'Make a custom REST API call to nOps',
      displayName: 'Custom REST API Call',
      name: 'custom_rest_api_call',
    }),
  ],
  triggers: [],
});
