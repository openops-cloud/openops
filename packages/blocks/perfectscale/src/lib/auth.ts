import { BlockAuth, Property } from '@openops/blocks-framework';

export interface PerfectScaleAuth {
  clientId: string;
  clientSecret: string;
}

const markdown = `
Authenticate with your PerfectScale API Client ID and Client Secret to access PerfectScale services.
You can generate your credentials by following the instructions in the [PerfectScale API documentation](https://docs.perfectscale.io/public-api).
`;

export const perfectscaleAuth = BlockAuth.CustomAuth({
  authProviderKey: 'perfectscale',
  authProviderDisplayName: 'PerfectScale',
  authProviderLogoUrl: 'https://static.openops.com/blocks/perfectscale.jpeg',
  description: markdown,
  required: true,
  props: {
    clientId: Property.SecretText({
      displayName: 'Client ID',
      required: true,
    }),
    clientSecret: Property.SecretText({
      displayName: 'Client Secret',
      description: 'The client secret',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    // Add validation logic here
    return { valid: true };
  },
});
