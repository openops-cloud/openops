import { BlockAuth, Property } from '@openops/blocks-framework';

const description = `
Configure authentication credentials for HTTP requests. 

Choose from multiple authentication methods:
- **None**: No authentication required
- **API Key**: Add an API key to headers or query parameters
- **Bearer Token**: Add a bearer token to the Authorization header
- **Basic Auth**: Use username and password for basic authentication
- **Custom Headers**: Add custom authentication headers

Fill in only the fields relevant to your selected authentication type.
`;

export const httpAuth = BlockAuth.CustomAuth({
  authProviderKey: 'http',
  authProviderDisplayName: 'HTTP',
  authProviderLogoUrl: 'https://static.openops.com/blocks/http.png',
  required: false,
  description,
  props: {
    value: Property.Json({
      displayName: 'Auth Object',
      required: false,
    }),
  },
});
export interface HttpAuth {
  authentication_type: string;
  api_key_name?: string;
  api_key_value?: string;
  api_key_location?: string;
  bearer_token?: string;
  basic_auth_username?: string;
  basic_auth_password?: string;
  custom_headers?: Record<string, string>;
}
