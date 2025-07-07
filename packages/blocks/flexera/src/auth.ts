import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Flexera API Token to access Flexera services.
`;

export const flexeraAuth = BlockAuth.SecretAuth({
  authProviderKey: 'Flexera',
  authProviderDisplayName: 'Flexera',
  authProviderLogoUrl: `https://static.openops.com/blocks/flexera.png`,
  description: markdown,
  displayName: 'API Key',
  required: true,
});
