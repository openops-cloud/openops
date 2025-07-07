import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { flexeraAuth } from './auth';
import { getClusterAggregatedSummaryCostsAction } from './lib/actions/get-cluster-aggregated-summary-costs-action';
import { getClustersAction } from './lib/actions/get-clusters-action';

export const flexera = createBlock({
  displayName: 'Flexera',
  auth: flexeraAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/flexera.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getClustersAction,
    getClusterAggregatedSummaryCostsAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://api.spotinst.io',
      auth: flexeraAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Flexera API documentation](https://docs.spot.io/api/).',
        }),
      },
      authMapping: async (auth) => ({
        Authorization: `Bearer ${auth}`,
      }),
    }),
  ],
  triggers: [],
});
