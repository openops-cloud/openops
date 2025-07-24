import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getClusterWorkloadsAction } from './lib/actions/get-cluster-workloads-action';
import { getClustersAction } from './lib/actions/get-clusters-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations';
import { PerfectScaleAuth, perfectscaleAuth } from './lib/auth';
import { BASE_URL, generateAccessToken } from './lib/common/make-request';

export const perfectscale = createBlock({
  displayName: 'PerfectScale',
  auth: perfectscaleAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/perfectscale.jpeg',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getClustersAction,
    getClusterWorkloadsAction,
    getRecommendationsAction,
    createCustomApiCallAction({
      baseUrl: () => BASE_URL,
      auth: perfectscaleAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [PerfectScale API documentation](https://docs.perfectscale.io/public-api#endpoints).',
        }),
      },
      authMapping: async ({ auth }) => {
        const accessToken = await generateAccessToken({
          clientSecret: (auth as PerfectScaleAuth).clientSecret,
          clientId: (auth as PerfectScaleAuth).clientId,
        });

        return {
          Authorization: `Bearer ${accessToken}`,
        };
      },
    }),
  ],
  triggers: [],
});
