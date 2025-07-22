import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { cloudfixAuth } from './lib/common/auth';

export const cloudfix = createBlock({
  displayName: 'CloudFix',
  auth: cloudfixAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudfix.svg',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth: any) => auth.apiUrl,
      auth: cloudfixAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value: 'TODO',
        }),
      },
      authMapping: async (context) => ({
        Bearer: (context.auth as any).apiToken,
      }),
    }),
  ],
  triggers: [],
});
