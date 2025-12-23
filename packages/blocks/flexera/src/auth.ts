import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Flexera API Token to access Flexera services.
`;

export const flexeraSpotAuth = BlockAuth.SecretAuth({
  authProviderKey: 'Flexera',
  authProviderDisplayName: 'Flexera Spot',
  authProviderLogoUrl: `/blocks/flexera-spot.png`,
  description: markdown,
  displayName: 'API Key',
  required: true,
});
