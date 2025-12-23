import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, OAuth2PropertyValue } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { findEmailAction } from './lib/actions/find-email';
import { forwardEmailAction } from './lib/actions/forward-email';
import { moveEmailToFolderAction } from './lib/actions/move-email-to-folder';
import { replyEmailAction } from './lib/actions/reply-email';
import { sendEmailAction } from './lib/actions/send-email';
import { microsoftOutlookAuth } from './lib/common/auth';
import { newEmailTrigger } from './lib/triggers/new-email';

export const microsoftOutlook = createBlock({
  displayName: 'Microsoft Outlook',
  auth: microsoftOutlookAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/microsoft-outlook.png',
  categories: [BlockCategory.COLLABORATION],
  authors: [],
  actions: [
    sendEmailAction,
    replyEmailAction,
    moveEmailToFolderAction,
    forwardEmailAction,
    findEmailAction,
    createCustomApiCallAction({
      auth: microsoftOutlookAuth,
      baseUrl: () => 'https://graph.microsoft.com/v1.0/',
      authMapping: async (auth) => ({
        Authorization: `Bearer ${
          (auth as unknown as OAuth2PropertyValue).access_token
        }`,
      }),
    }),
  ],
  triggers: [newEmailTrigger],
});
