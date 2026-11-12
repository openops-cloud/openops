import { HttpMethod } from '@openops/blocks-common';
import { BlockAuth, Property } from '@openops/blocks-framework';
import { sendOptScaleRequest, signIn } from './common/make-request';

const markdown = `
Authenticate with the email and password of an OptScale user.

1. Use a user that signs in with a password. Users that only sign in with Google or Microsoft SSO cannot be used.
2. Read-only actions require the **Member** role. Dismissing recommendations and assigning resources require the **Engineer** role. Setting pool budgets requires the **Manager** role.
3. For self-hosted OptScale, set the URL to your OptScale host, for example \`https://optscale.example.com\`.

We recommend creating a dedicated OptScale user for OpenOps.
`;

export const optscaleAuth = BlockAuth.CustomAuth({
  authProviderKey: 'OptScale',
  authProviderDisplayName: 'OptScale',
  authProviderLogoUrl: '/blocks/optscale.svg',
  description: markdown,
  required: true,
  props: {
    baseUrl: Property.ShortText({
      displayName: 'OptScale URL',
      description:
        'The URL of your OptScale host, without a path, for example https://my.optscale.com',
      required: true,
      defaultValue: 'https://my.optscale.com',
    }),
    email: Property.ShortText({
      displayName: 'Email',
      required: true,
    }),
    password: Property.SecretText({
      displayName: 'Password',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    try {
      await signIn(auth);
    } catch (error) {
      return {
        valid: false,
        error: `Could not sign in to OptScale: ${(error as Error).message}`,
      };
    }

    try {
      await sendOptScaleRequest({
        auth,
        method: HttpMethod.GET,
        path: '/organizations',
        query: { limit: 1 },
      });
    } catch (error) {
      return {
        valid: false,
        error: `Signed in to OptScale but could not reach the REST API: ${
          (error as Error).message
        }`,
      };
    }

    return { valid: true };
  },
});
