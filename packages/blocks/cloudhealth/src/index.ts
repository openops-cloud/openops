import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getAssetMetadataAction } from './lib/actions/get-asset-metadata-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations-action';
import { graphqlAction } from './lib/actions/graphql-action';
import { cloudhealthAuth } from './lib/auth';
import { BASE_CH_URL } from './lib/common/base-url';

export const cloudhealth = createBlock({
  displayName: 'CloudHealth',
  auth: cloudhealthAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudhealth.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getRecommendationsAction,
    getAssetMetadataAction,

    createCustomApiCallAction({
      baseUrl: () => `${BASE_CH_URL}/`,
      auth: cloudhealthAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [CloudHealth API documentation](https://apidocs.cloudhealthtech.com/).',
        }),
      },
      authMapping: async (context) => ({
        Authorization: `Bearer ${context.auth as string}`,
        'Content-Type': 'application/json',
      }),
      description: 'Make a custom REST API call',
      displayName: 'Custom REST API Call',
      name: 'custom_rest_api_call',
    }),
    graphqlAction,
  ],
  triggers: [],
});
