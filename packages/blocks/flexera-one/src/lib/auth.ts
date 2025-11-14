import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Flexera Refresh Token to access Flexera services.

See [Flexera Documentation](https://docs.flexera.com/flexera/EN/FlexeraAPI/GenerateRefreshToken.htm) for more details.
`;

export const flexeraAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Flexera-One',
  authProviderDisplayName: 'Flexera',
  authProviderLogoUrl: `https://static.openops.com/blocks/flexera.png`,
  description: markdown,
  required: true,
  props: {
    appRegion: Property.StaticDropdown({
      displayName: 'App Region',
      description: `Select the region where your Flexera application is hosted`,
      required: true,
      options: {
        options: [
          { label: 'US', value: 'us' },
          { label: 'EMEA', value: 'eu' },
          { label: 'APAC', value: 'apac' },
        ],
      },
      defaultValue: 'us',
    }),
    refreshToken: Property.SecretText({
      required: true,
      displayName: 'Refresh Token',
      description: 'The refresh token to use to connect to Flexera',
    }),
    orgId: Property.ShortText({
      displayName: 'Organization ID',
      description: 'The organization ID to use for Flexera API calls',
      required: true,
    }),
    projectId: Property.ShortText({
      displayName: 'Project ID',
      description: 'The project ID to use for Flexera API calls',
      required: true,
    }),
  },
});
