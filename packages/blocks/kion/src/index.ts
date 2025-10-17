import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { kionAuth, KionAuth } from './lib/auth';

export const kion = createBlock({
  displayName: 'Kion',
  auth: kionAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/kion.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: (auth) => {
        return `${(auth as KionAuth).instanceUrl}/api/`;
      },
      auth: kionAuth,
      additionalProps: {
        documentation: Property.DynamicProperties({
          displayName: '',
          refreshers: ['auth'],
          required: true,
          props: async ({ auth }) => {
            return {
              docs: Property.MarkDown({
                value: `For more information, visit the [Kion API documentation](${
                  (auth as KionAuth).instanceUrl
                }/swagger).`,
              }),
            } as any;
          },
        }),
      },
      authMapping: async (context) => {
        const kionAuth = context.auth as KionAuth;
        return {
          Authorization: `Bearer ${kionAuth.apiKey}`,
          'Content-Type': 'application/json',
        };
      },
      description: 'Make a custom REST API call to Kion',
      displayName: 'Custom REST API Call',
      name: 'custom_rest_api_call',
    }),
  ],
  triggers: [],
});
