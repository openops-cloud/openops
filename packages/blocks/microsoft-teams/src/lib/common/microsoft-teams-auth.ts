import {
  BlockAuth,
  BlockPropValueSchema,
  Property,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { OAuth2GrantType } from '@openops/shared';

export const microsoftTeamsAuth = BlockAuth.OAuth2({
  authProviderKey: 'Microsoft_Teams',
  authProviderDisplayName: 'Microsoft Teams',
  authProviderLogoUrl: `/blocks/microsoft-teams.png`,
  description: '⚠️ You can only use school or work accounts.',
  required: true,
  scope: [
    'User.Read',
    'User.ReadBasic.All',
    'ChannelMessage.Send',
    'Channel.ReadBasic.All',
    'Chat.ReadBasic',
    'Chat.Read',
    'Chat.ReadWrite',
    'Chat.Create',
    'ChatMessage.Send',
    'ChatMessage.Read',
    'Team.ReadBasic.All',
    'offline_access',
  ],
  props: {
    tenantId: Property.ShortText({
      displayName: 'Tenant ID',
      description:
        'Leave as "common" to allow any Microsoft work or school account to connect. Enter a tenant ID to restrict connections to a specific organization.',
      required: false,
      defaultValue: 'common',
    }),
  },
  authUrl: 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token',
  grantType: OAuth2GrantType.AUTHORIZATION_CODE,
  validate: async ({ auth }) => {
    try {
      const authValue = auth as BlockPropValueSchema<typeof microsoftTeamsAuth>;
      const client = getMicrosoftGraphClient(authValue.access_token);

      await client.api('/me').get();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid Credentials.' };
    }
  },
});
