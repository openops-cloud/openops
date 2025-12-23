import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { flexeraSpotAuth } from './auth';
import { getClustersAction } from './lib/actions/get-clusters-action';

export const flexera = createBlock({
  displayName: 'Flexera Spot',
  auth: flexeraSpotAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/flexera-spot.png',
  authors: [],
  categories: [BlockCategory.FINOPS],
  actions: [
    getClustersAction,
    createCustomApiCallAction({
      baseUrl: () => 'https://api.spotinst.io',
      auth: flexeraSpotAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Flexera API documentation](https://docs.spot.io/api/).',
        }),
      },
      authMapping: async ({ auth }) => ({
        Authorization: `Bearer ${auth}`,
      }),
    }),
  ],
  triggers: [],
});
