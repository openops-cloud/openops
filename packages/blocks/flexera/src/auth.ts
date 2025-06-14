import { BlockAuth, Property } from '@openops/blocks-framework';

export const flexeraAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Flexera',
  authProviderDisplayName: 'Flexera',
  authProviderLogoUrl: `https://static.openops.com/blocks/flexera.png`,
  description:
    'Authenticate with your Flexera API Token to access Flexera services.',
  required: true,
  props: {
    apiToken: Property.SecretText({
      displayName: 'API Token',
      description: 'Your Flexera API Token',
      required: true,
    }),
  },
});
