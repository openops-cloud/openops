import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getAwsRecommendationsAction } from './lib/actions/get-aws-recommendations-action';
import { getAzureRecommendationsAction } from './lib/actions/get-azure-recommendations-action';
import { getContainersRecommendationsAction } from './lib/actions/get-container-recommendations-action';
import { getGcpRecommendationsAction } from './lib/actions/get-gcp-recommendations-action';
import { cloudabilityAuth } from './lib/auth';

const markdown = `
For more information, visit the [Cloudability API documentation](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-getting-started-cloudability-v3).
`;

export const cloudability = createBlock({
  displayName: 'Cloudability',
  auth: cloudabilityAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/cloudability.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getAwsRecommendationsAction,
    getAzureRecommendationsAction,
    getGcpRecommendationsAction,
    getContainersRecommendationsAction,
    createCustomApiCallAction({
      baseUrl: (auth: any) => auth.apiUrl,
      auth: cloudabilityAuth,
      authMapping: async (context: any) => {
        const { apiKey } = context.auth;
        const encoded = Buffer.from(`${apiKey}:`).toString('base64');
        return {
          Authorization: `Basic ${encoded}`,
        };
      },
      additionalProps: {
        documentation: Property.MarkDown({
          value: markdown,
        }),
      },
    }),
  ],
  triggers: [],
});
