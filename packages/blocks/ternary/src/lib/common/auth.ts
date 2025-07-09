import { HttpError, HttpMethod } from '@openops/blocks-common';
import { BlockAuth, Property, Validators } from '@openops/blocks-framework';
import { sendTernaryRequest } from './index';

const markdown = `
Authenticate with your Ternary API Token to access Ternary services.
You can generate an API token by following the instructions in the [Ternary API documentation](https://docs.ternary.app/reference/using-the-api).
`;

export const ternaryCloudAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Ternary',
  authProviderDisplayName: 'Ternary',
  authProviderLogoUrl: `https://static.openops.com/blocks/ternary.png`,
  description: markdown,
  required: true,
  props: {
    apiKey: Property.SecretText({
      displayName: 'API key',
      defaultValue: '',
      required: true,
    }),
    tenantId: Property.ShortText({
      displayName: 'Tenant ID',
      defaultValue: '',
      required: true,
    }),
    apiURL: Property.ShortText({
      displayName: 'API URL',
      defaultValue: '',
      description:
        'For example: https://core-api.eu.ternary.app\nNote: For the Net Cost block, you need to set the API URL to https://api.eu.ternary.app',
      required: true,
      validators: [Validators.url],
    }),
  },
  validate: async ({ auth }) => {
    try {
      await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'me',
      });
      return {
        valid: true,
      };
    } catch (e) {
      return {
        valid: false,
        error: ((e as HttpError).response.body as any).message,
      };
    }
  },
});

export type ternaryAuth = {
  apiKey: string;
  tenantId: string;
  apiURL: string;
};
