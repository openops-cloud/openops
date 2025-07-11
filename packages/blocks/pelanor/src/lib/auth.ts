import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Pelanor API Token to access Pelanor services.

1. Go to [https://app.pelanor.io](https://app.pelanor.io) and log in to your account.
2. Once logged in, go to Settings > API Tokens.
3. Click "Add New API Token" if you do not already have one.
4. Copy and securely store your API token and secret.
5. Paste your API token and secret into the fields below.
`;

export const pelanorAuth = BlockAuth.CustomAuth({
  authProviderKey: 'pelanor',
  authProviderDisplayName: 'Pelanor',
  authProviderLogoUrl: 'https://static.openops.com/blocks/pelanor.png',
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
  },
  validate: async ({ auth }) => {
    // Add validation logic here
    return { valid: true };
  },
});
