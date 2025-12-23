import { BlockAuth, Property, Validators } from '@openops/blocks-framework';

const markdown = `
To get your Kion API key:

1. Log into your Kion platform
2. Click on your initials in the top right corner.
3. Select App API Keys
4. Generate a new API Key
5. Store the API Key

For more information, visit the [Kion API documentation](https://support.kion.io/hc/en-us/articles/360055160791-App-API-Access).
`;

export const kionAuth = BlockAuth.CustomAuth({
  authProviderKey: 'kion',
  authProviderDisplayName: 'Kion',
  authProviderLogoUrl: '/blocks/kion.png',
  description: markdown,
  required: true,
  props: {
    instanceUrl: Property.ShortText({
      displayName: 'Instance URL',
      description:
        'The URL of your Kion instance (e.g., https://your-instance.kion.io)',
      required: true,
      validators: [Validators.url],
    }),
    apiKey: Property.SecretText({
      displayName: 'API Key',
      description: 'Your Kion API Key',
      required: true,
    }),
  },
});

export type KionAuth = {
  instanceUrl: string;
  apiKey: string;
};
