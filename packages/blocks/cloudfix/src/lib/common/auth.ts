import { BlockAuth, Property, Validators } from '@openops/blocks-framework';

const markdown = `
To get your CloudFix API key:

1. From the CloudFix app, click on "Settings" on the top menu.
2. Then, click on the "API Tokens" tab, and then "Create Token" button. 
3. Enter a name for your token, and select an appropriate role - Reader, Resource Manager, or Runbook Manager.`;

export const cloudfixAuth = BlockAuth.CustomAuth({
  required: true,
  authProviderKey: 'cloudfix',
  authProviderDisplayName: 'CloudFix',
  authProviderLogoUrl: 'https://static.openops.com/blocks/cloudfix.png',
  description: markdown,
  props: {
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: 'The base URL for the CloudFix API',
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://preview.app.cloudfix.com/api/v3',
    }),
    apiToken: Property.SecretText({
      required: true,
      displayName: 'API Token',
      description: 'The API token to use to connect to CloudFix',
    }),
  },
});

export interface CloudfixAuth {
  apiUrl: string;
  apiToken: string;
}
