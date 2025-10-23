import { BlockAuth, Property } from '@openops/blocks-framework';

const description = `
Provide optional HTTP headers. To authenticate, set the Authorization header.

Examples:
- Bearer token: { Authorization: 'Bearer <token>' }
- Basic auth: { Authorization: 'Basic <base64(username:password)>' }
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
          required: false,
          defaultValue: 'Authorization',
        }),
        value: Property.ShortText({
          displayName: 'Header Value',
          required: false,
        }),
      },
    }),
  },
});
