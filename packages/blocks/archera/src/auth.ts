import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
Connecting to the Archera API

1. Go to [https://app.archera.ai](https://app.archera.ai) and log in to your account.

2. Once logged in, go to the API section here: [https://app.archera.ai/settings?section=user&tab=api](https://app.archera.ai/settings?section=user&tab=api)

3. Click Create New API Key if you do not already have one.

4. Copy and securely store your API key.

4. Find your Organization ID: your Organization ID (org_id) is displayed in the API section.

5. Paste your API key and OrgId into the respective fields below`;

export const archeraAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Archera',
  authProviderDisplayName: 'Archera',
  authProviderLogoUrl: `https://static.openops.com/blocks/archera.svg`,
  description: markdown,
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
