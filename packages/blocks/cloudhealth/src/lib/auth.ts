import { BlockAuth } from '@openops/blocks-framework';

const markdown = `
To get your CloudHealth API key:

1. Log into your CloudHealth account
2. Click on 'My Profile' in your user settings
3. In your profile settings, scroll to the API Key section and click 'Get API Key'
4. Then click 'Save Profile Changes'
5. Select the appropriate permissions


For more information, visit the [CloudHealth API documentation](https://apidocs.cloudhealthtech.com/).
`;

export const cloudhealthAuth = BlockAuth.SecretAuth({
  displayName: 'API Key',
  required: true,
  authProviderKey: 'cloudhealth',
  authProviderDisplayName: 'CloudHealth',
  authProviderLogoUrl: '/blocks/cloudhealth.png',
  description: markdown,
});
