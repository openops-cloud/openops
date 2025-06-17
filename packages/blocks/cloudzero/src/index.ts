import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { cloudzeroAuth } from './lib/auth';

export const cloudzero = createBlock({
  displayName: 'Cloudzero',
  auth: cloudzeroAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudzero.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://api.cloudzero.com',
      auth: cloudzeroAuth,
      authMapping: async (context) => ({
        Authorization: context.auth as string,
      }),
    }),
  ],
  triggers: [],
});
