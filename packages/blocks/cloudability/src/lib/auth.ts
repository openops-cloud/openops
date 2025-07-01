import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
To get your Cloudability API key:

1. From the Cloudability Dashboard, select the user icon and 'Manage Profile'.
2. Navigate to the Preferences tab
3. In the Cloudability API section, select Enable Access. Cloudability generates the API key and shows it in the API KEY field. 
   If access has been previously enabled, select Regenerate Key to revoke the previous key and create a new one.

For more information, visit the [Cloudability API documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-about-cloudability).
`;

export const cloudabilityAuth = BlockAuth.SecretAuth({
  displayName: 'API Key',
  required: true,
  authProviderKey: 'cloudability',
  authProviderDisplayName: 'Cloudability',
  authProviderLogoUrl: 'https://static.openops.com/blocks/cloudability.png',
  description: markdown,
});
