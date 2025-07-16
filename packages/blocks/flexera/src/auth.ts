import { BlockAuth, Property, Validators } from '@openops/blocks-framework';

const markdown = `
Authenticate with your Flexera Refresh Token to access Flexera services.

See [Flexera Documentation](https://docs.flexera.com/flexera/EN/FlexeraAPI/GenerateRefreshToken.htm) for more details.
`;

export const flexeraAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Flexera',
  authProviderDisplayName: 'Flexera',
  authProviderLogoUrl: `https://static.openops.com/blocks/flexera.png`,
  description: markdown,
  required: true,
  props: {
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: `US: https://api.flexera.com/
EU: https://api.flexera.eu/
APAC: https://api.flexera.au/`,
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://api.flexera.com/',
    }),
    refreshToken: Property.SecretText({
      required: true,
      displayName: 'Refresh Token',
      description: 'The refresh token to use to connect to Flexera',
    }),
  },
});
