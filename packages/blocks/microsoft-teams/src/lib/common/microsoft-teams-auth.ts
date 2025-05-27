import { BlockAuth, BlockPropValueSchema } from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from './get-microsoft-graph-client';

export const microsoftTeamsAuth = BlockAuth.OAuth2({
  description: '⚠️ You can only use school or work accounts.',
  required: true,
  scope: [
    'User.Read',
    'ChannelMessage.Send',
    'ChatMessage.Send',
    'offline_access',
  ],
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  validate: async ({ auth }) => {
    try {
      const authValue = auth as BlockPropValueSchema<typeof microsoftTeamsAuth>;
      const client = getMicrosoftGraphClient(authValue.access_token);

      console.log('TESTING AUTH', authValue);
      await client.api('/me').get();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid Credentials.' };
    }
  },
});
