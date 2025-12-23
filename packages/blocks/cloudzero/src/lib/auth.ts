import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
To get your CloudZero API key:

1. Log into your CloudZero account
2. Navigate to Settings > API Keys
3. Select "Create New API Key"
4. Enter a name and description for your key
5. Select the appropriate API Key Scopes (you must select at least 1)
6. Select "Create API Key"
7. Copy the API key displayed (it will not be shown again)
8. Select "Close"

> ⚠️ WARNING: The API key will not be shown again after creation.

For more information, visit the [CloudZero API documentation](https://docs.cloudzero.com/reference/authorization).
`;

export const cloudzeroAuth = BlockAuth.SecretAuth({
  displayName: 'API Key',
  required: true,
  authProviderKey: 'cloudzero',
  authProviderDisplayName: 'CloudZero',
  authProviderLogoUrl: '/blocks/cloudzero.png',
  description: markdown,
});
