import { BlockAuth, Property } from '@openops/blocks-framework';

const description = `
Provide optional HTTP headers as key-value pairs. To authenticate, add an Authorization header.

Note: Headers defined in the step settings will override these auth headers if they have the same key.

Examples:
- Bearer token: Key: 'Authorization', Value: 'Bearer <token>'
- Basic auth: Key: 'Authorization', Value: 'Basic <base64(username:password)>'
- API key: Key: 'X-API-Key', Value: '<api-key>'
`;

export const httpAuth = BlockAuth.CustomAuth({
  authProviderKey: 'http',
  authProviderDisplayName: 'HTTP',
  authProviderLogoUrl: 'https://static.openops.com/blocks/http.png',
  required: false,
  description,
  props: {
    headers: Property.Array({
      displayName: 'Headers',
      required: false,
      properties: {
        key: Property.ShortText({
          displayName: 'Header Key',
          required: true,
          defaultValue: 'Authorization',
        }),
        value: Property.SecretText({
          displayName: 'Header Value',
          required: true,
        }),
      },
    }),
  },
});
