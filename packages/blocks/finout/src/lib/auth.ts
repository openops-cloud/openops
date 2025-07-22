import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Finout API Token to access Finout services.
You can generate an API token by following the instructions in the [Finout API documentation](https://docs.finout.io/configuration/finout-api/generate-an-api-token).
`;

export interface FinOutAuth {
  clientId: string;
  secretKey: string;
}

export const finoutAuth = BlockAuth.CustomAuth({
  authProviderKey: 'finout',
  authProviderDisplayName: 'Finout',
  authProviderLogoUrl: 'https://static.openops.com/blocks/finout.png',
  description: markdown,
  required: true,
  props: {
    clientId: Property.SecretText({
      displayName: 'Client ID',
      required: true,
    }),
    secretKey: Property.SecretText({
      displayName: 'Secret Key',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    // Add validation logic here
    return { valid: true };
  },
});
