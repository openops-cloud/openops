import { BlockAuth, Property } from '@openops/blocks-framework';

export const archeraAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Archera',
  authProviderDisplayName: 'Archera',
  authProviderLogoUrl: `https://static.openops.com/blocks/archera.jpeg`,
  description: '',
  required: true,
  props: {
    apiToken: Property.SecretText({
      displayName: 'API Token',
      description: 'Your Archera API Token',
      required: true,
    }),
    orgId: Property.ShortText({
      displayName: 'Organization ID',
      description: 'Your Archera Organization ID',
      required: true,
    }),
  },
});
