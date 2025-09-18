import { BlockAuth, BlockPropValueSchema } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';

export const microsoftAuth = BlockAuth.OAuth2({
  authProviderKey: 'Microsoft_Teams',
  authProviderDisplayName: 'Microsoft Teams',
  authProviderLogoUrl: `https://static.openops.com/blocks/microsoft-teams.png`,
  description: '⚠️ You can only use school or work accounts.',
  required: true,
  scope: [
    'User.Read',
    'Mail.Read',
    'ChannelMessage.Send',
    'ChatMessage.Send',
    'offline_access',
  ],
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  validate: async ({ auth }) => {
    try {
      const authValue = auth as BlockPropValueSchema<typeof microsoftAuth>;
      const client = getMicrosoftGraphClient(authValue.access_token);

      await client.api('/me').get();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid Credentials.' };
    }
  },
});
