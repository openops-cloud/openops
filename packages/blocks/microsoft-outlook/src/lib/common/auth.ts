import { BlockAuth, BlockPropValueSchema } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';

export const microsoftOutlookAuth = BlockAuth.OAuth2({
  authProviderKey: 'Microsoft_Outlook',
  authProviderDisplayName: 'Microsoft Outlook',
  authProviderLogoUrl: '/blocks/microsoft-outlook.png',
  required: true,
  scope: ['Mail.ReadWrite', 'Mail.Send', 'offline_access', 'User.Read'],
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  validate: async ({ auth }) => {
    try {
      const authValue = auth as BlockPropValueSchema<
        typeof microsoftOutlookAuth
      >;
      const client = getMicrosoftGraphClient(authValue.access_token);

      await client.api('/me').get();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid Credentials.' };
    }
  },
});
