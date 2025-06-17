import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { cloudhealthAuth } from './lib/auth';
import { graphqlAction } from './lib/graphql-action';

export const cloudhealth = createBlock({
  displayName: 'CloudHealth',
  auth: cloudhealthAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudhealth.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    createCustomApiCallAction({
      baseUrl: () => 'https://chapi.cloudhealthtech.com/v1',
      auth: cloudhealthAuth,
      authMapping: async (context) => ({
        Authorization: `Bearer ${context.auth as string}`,
        'Content-Type': 'application/json',
      }),
      description: 'Make a custom REST API call to CloudHealth',
      displayName: 'Custom REST API Call',
      name: 'custom_rest_api_call',
    }),
    graphqlAction,
  ],
  triggers: [],
});
