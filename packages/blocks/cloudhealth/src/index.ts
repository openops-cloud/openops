import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getAwsAccountsAction } from './lib/actions/get-aws-accounts-action';
import { getAzureSubscriptionsAction } from './lib/actions/get-azure-subscriptions-action';
import { getGcpProjectsAction } from './lib/actions/get-gcp-projections-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations-action';
import { graphqlAction } from './lib/actions/graphql-action';
import { searchAssetsAction } from './lib/actions/search-assets-action';
import { tagAssetAction } from './lib/actions/tag-asset-action';
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
    getAwsAccountsAction,
    getAzureSubscriptionsAction,
    getGcpProjectsAction,
    getRecommendationsAction,
    searchAssetsAction,
    tagAssetAction,

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
