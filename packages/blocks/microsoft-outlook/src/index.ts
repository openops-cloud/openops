import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, OAuth2PropertyValue } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { findEmailAction } from '../../microsoft-outlook/src/lib/actions/find-email';
import { forwardEmailAction } from '../../microsoft-outlook/src/lib/actions/forward-email';
import { moveEmailToFolderAction } from '../../microsoft-outlook/src/lib/actions/move-email-to-folder';
import { replyEmailAction } from '../../microsoft-outlook/src/lib/actions/reply-email';
import { sendEmailAction } from '../../microsoft-outlook/src/lib/actions/send-email';
import { microsoftOutlookAuth } from '../../microsoft-outlook/src/lib/common/auth';

export const microsoftOutlook = createBlock({
  displayName: 'Microsoft Outlook 1',
  auth: microsoftOutlookAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '',
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
  triggers: [],
});
