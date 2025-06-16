import { BlockAuth } from '@openops/blocks-framework';

export const cloudzeroAuth = BlockAuth.SecretAuth({
  displayName: 'API Key',
  required: true,
  authProviderKey: 'cloudzero',
  authProviderDisplayName: 'CloudZero',
  authProviderLogoUrl: 'https://static.openops.com/blocks/cloudzero.png',
});
