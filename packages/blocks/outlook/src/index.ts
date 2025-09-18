import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, OAuth2PropertyValue } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { microsoftAuth } from './lib/common/outlook-auth';
import { newEmailTrigger } from './lib/triggers/new-email';

export const outlook = createBlock({
  displayName: 'Microsoft Outlook',
  description:
    'Integration with Microsoft Outlook/Office 365 for email operations',
  auth: microsoftAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/outlook.png',
  categories: [BlockCategory.COLLABORATION],
  authors: ['OpenOps'],
  actions: [
    createCustomApiCallAction({
      auth: microsoftAuth,
      baseUrl: () => 'https://graph.microsoft.com/v1.0/',
      authMapping: async (context: any) => ({
        Authorization: `Bearer ${
          (context.auth as OAuth2PropertyValue).access_token
        }`,
      }),
    }),
  ],
  triggers: [newEmailTrigger],
});
