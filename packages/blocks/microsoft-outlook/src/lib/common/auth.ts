import {
  BlockAuth,
  BlockPropValueSchema,
  Property,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { OAuth2GrantType } from '@openops/shared';

export const microsoftOutlookAuth = BlockAuth.OAuth2({
  authProviderKey: 'Microsoft_Outlook',
  authProviderDisplayName: 'Microsoft Outlook',
  authProviderLogoUrl: '/blocks/microsoft-outlook.png',
  required: true,
  scope: ['Mail.ReadWrite', 'Mail.Send', 'offline_access', 'User.Read'],
  props: {
    tenantId: Property.ShortText({
      displayName: 'Tenant ID',
      description:
        'Leave as "common" to allow any Microsoft work or school account to connect. Enter a tenant ID to restrict connections to a specific organization.',
      required: true,
      defaultValue: 'common',
    }),
  },
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  grantType: OAuth2GrantType.AUTHORIZATION_CODE,
  extra: {
    prompt: 'select_account',
  },
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
