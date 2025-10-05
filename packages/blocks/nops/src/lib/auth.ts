import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
To get your nOps API key:

1. Log into your nOps account at [https://app.nops.io](https://app.nops.io)
2. Go directly to [API Key settings](https://app.nops.io/v3/settings?tab=API%20Key)
3. Click **Let's Generate Your API Key**
4. Click **Save** (signature verification is optional and can be left blank)
5. Copy the generated API key from the confirmation dialog
6. Store it securely - you won't be able to copy it later

> ⚠️ **Important**: The API key will only be displayed once. Make sure to copy and store it securely.

For more information, visit the [nOps Developer API documentation](https://help.nops.io/docs/nops/developer-intro).
`;

export interface nOpsAuth {
  apiKey: string;
  signature?: string;
}

export const nopsAuth = BlockAuth.CustomAuth({
  authProviderKey: 'nops',
  authProviderDisplayName: 'nOps',
  authProviderLogoUrl: 'https://static.openops.com/blocks/nops.png',
  description: markdown,
  required: true,
  props: {
    apiKey: Property.SecretText({
      displayName: 'API Key',
      description: 'Your nOps API key',
      required: true,
    }),
    signature: Property.SecretText({
      displayName: 'Signature (optional)',
      description:
        'If your API key requires signatures, paste the generated base64 signature here. It will be sent as x-nops-signature.',
      required: false,
    }),
  },
});
