import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { pelanorAuth } from './lib/auth';

export const pelanor = createBlock({
  displayName: 'Pelanor',
  auth: pelanorAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/pelanor.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth: any) => auth.apiUrl,
      auth: pelanorAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Pelanor API documentation](https://app.pelanor.io/api-docs).',
        }),
      },
      authMapping: async ({ auth }: any) => ({
        Authorization: `Bearer ${auth.tokenId}:${auth.tokenSecret}`,
      }),
    }),
  ],
  triggers: [],
});
