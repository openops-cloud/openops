import { BlockAuth, Property } from '@openops/blocks-framework';
import { getDatabricsToken } from './get-databrics-token';

export const databricksAuth = BlockAuth.CustomAuth({
  required: true,
  props: {
    accountId: Property.ShortText({
      displayName: 'Account ID',
      required: true,
    }),
    clientId: Property.ShortText({
      displayName: 'Client ID',
      required: true,
    }),
    clientSecret: BlockAuth.SecretText({
      displayName: 'Client Secret',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    try {
      await getDatabricsToken(auth);
      return { valid: true };
    } catch {
      return { valid: false, error: '' };
    }
  },
});
