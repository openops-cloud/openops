import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
To get your Vantage API key, visit the [Vantage documentation](https://vantage.readme.io/reference/authentication).
`;

export const vantageAuth = BlockAuth.SecretAuth({
  displayName: 'API Key',
  required: true,
  authProviderKey: 'vantage',
  authProviderDisplayName: 'Vantage',
  authProviderLogoUrl: 'https://static.openops.com/blocks/vantage.png',
  description: markdown,
});
