import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock } from '@openops/blocks-framework';
import { flexeraAuth } from './auth';
import { getClusterAggregatedSummaryCostsAction } from './lib/actions/get-cluster-aggregated-summary-costs-action';
import { getClustersAction } from './lib/actions/get-clusters-action';

export const flexera = createBlock({
  displayName: 'Flexera',
  auth: flexeraAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/flexera.png',
  authors: [],
  actions: [
    getClustersAction,
    getClusterAggregatedSummaryCostsAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://api.spotinst.io',
      auth: flexeraAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${(auth as any).apiToken}`,
      }),
    }),
  ],
  triggers: [],
});
