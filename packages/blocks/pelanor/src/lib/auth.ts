import { BlockAuth, Property, Validators } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Pelanor API Token to access Pelanor services.

1. Go to [https://app.pelanor.io](https://app.pelanor.io) or [https://app-eu.pelanor.io](https://app-eu.pelanor.io) and log in to your account.
2. Once logged in, go to Settings > API Tokens.
3. Click "Add New API Token" if you do not already have one.
4. Copy and securely store your API token and secret.
5. Paste your API token and secret into the fields below.
`;

export const pelanorAuth = BlockAuth.CustomAuth({
  authProviderKey: 'pelanor',
  authProviderDisplayName: 'Pelanor',
  authProviderLogoUrl: '/blocks/pelanor.png',
  description: markdown,
  required: true,
  props: {
    tokenId: Property.SecretText({
      displayName: 'Token ID',
      required: true,
    }),
    tokenSecret: Property.SecretText({
      displayName: 'Token Secret',
      required: true,
    }),
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: `US: https://api.pelanor.io
EU: https://api-eu.pelanor.io`,
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://api.pelanor.io',
    }),
  },
  validate: async ({ auth }) => {
    // Add validation logic here
    return { valid: true };
  },
});
