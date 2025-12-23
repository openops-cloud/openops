import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
To generate a Vega Cloud API Client ID and Secret, visit the [Vega Cloud API documentation](https://docs.vegacloud.io/docs/platformguide/platform_settings/profile_settings/apiclientreg).
`;

export interface VegaCloudAuth {
  clientId: string;
  clientSecret: string;
  realm: string;
}

export const vegacloudAuth = BlockAuth.CustomAuth({
  authProviderKey: 'vegacloud',
  authProviderDisplayName: 'Vega Cloud',
  authProviderLogoUrl: '/blocks/vegacloud.svg',
  description: markdown,
  required: true,
  props: {
    clientSecret: Property.SecretText({
      displayName: 'Client Secret',
      required: true,
    }),
    clientId: Property.SecretText({
      displayName: 'Client ID',
      required: true,
    }),
    realm: Property.ShortText({
      displayName: 'Realm',
      description: 'Your Vega Cloud realm',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    // Add validation logic here
    return { valid: true };
  },
});
