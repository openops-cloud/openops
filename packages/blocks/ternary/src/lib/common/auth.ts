import { HttpError, HttpMethod } from '@openops/blocks-common';
import { BlockAuth, Property, Validators } from '@openops/blocks-framework';
import { Provider, getConnectionProvider } from '@openops/shared';
import { sendTernaryRequest } from './index';

export const ternaryCloudAuth = BlockAuth.CustomAuth({
  provider: getConnectionProvider(Provider.TERNARY),
  description: `
Ternary API documentation:
https://docs.ternary.app/reference/using-the-api`,
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
