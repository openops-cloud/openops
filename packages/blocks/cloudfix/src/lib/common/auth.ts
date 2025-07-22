import { BlockAuth, Property, Validators } from '@openops/blocks-framework';

const markdown = `
To get your Cloudfix API key:

1. Log into your Cloudfix account
2. Navigate to Settings > API Keys
3. Generate a new API key or copy an existing one

For more information, visit the [Cloudfix API documentation](https://docs.cloudfix.com/reference/introduction).
`;

export const cloudfixAuth = BlockAuth.CustomAuth({
  required: true,
  authProviderKey: 'cloudfix',
  authProviderDisplayName: 'Cloudfix',
  authProviderLogoUrl: 'https://static.openops.com/blocks/cloudfix.png',
  description: markdown,
  props: {
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: 'The base URL for the Cloudfix API',
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://preview.app.cloudfix.com/api/v3',
    }),
    apiKey: Property.SecretText({
      required: true,
      displayName: 'API Key',
      description: 'The API key to use to connect to Cloudfix',
    }),
  },
});

export interface CloudfixAuth {
  apiUrl: string;
  apiKey: string;
}
