import { BlockAuth, Property } from '@openops/blocks-framework';
export const archeraAuth = BlockAuth.CustomAuth({
  description: `todo
    `,
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
