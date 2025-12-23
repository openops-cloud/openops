import { BlockAuth, Property, Validators } from '@openops/blocks-framework';

const markdown = `
To get your Cloudability API key:

1. From the Cloudability Dashboard, select the user icon and 'Manage Profile'.
2. Navigate to the Preferences tab
3. In the Cloudability API section, select Enable Access. Cloudability generates the API key and shows it in the API KEY field.
   If access has been previously enabled, select Regenerate Key to revoke the previous key and create a new one.

For more information, visit the [Cloudability API documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-about-cloudability).
`;

export const cloudabilityAuth = BlockAuth.CustomAuth({
  required: true,
  authProviderKey: 'cloudability',
  authProviderDisplayName: 'Cloudability',
  authProviderLogoUrl: '/blocks/cloudability.png',
  description: markdown,
  props: {
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: `US: https://api.cloudability.com/v3
EMEA: https://api-eu.cloudability.com/v3
Middle East: https://api-me.cloudability.com/v3
APAC: https://api-au.cloudability.com/v3`,
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://api.cloudability.com/v3',
    }),
    apiKey: Property.SecretText({
      required: true,
      displayName: 'API Key',
      description: 'The API key to use to connect to Cloudability',
    }),
  },
});

export interface CloudabilityAuth {
  apiUrl: string;
  apiKey: string;
}
