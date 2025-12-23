import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { cloudzeroAuth } from './lib/auth';

export const cloudzero = createBlock({
  displayName: 'CloudZero',
  auth: cloudzeroAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/cloudzero.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://api.cloudzero.com',
      auth: cloudzeroAuth,
      authMapping: async (context) => ({
        Authorization: context.auth as string,
      }),
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [CloudZero API documentation](https://docs.cloudzero.com/reference/introduction).',
        }),
      },
    }),
  ],
  triggers: [],
});
