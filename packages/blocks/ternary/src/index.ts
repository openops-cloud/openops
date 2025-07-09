import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getBudgets } from './lib/actions/get-budgets';
import { getDataIntegrations } from './lib/actions/get-data-integrations';
import { ternaryCloudAuth } from './lib/common/auth';

export const ternary = createBlock({
  displayName: 'Ternary',
  auth: ternaryCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/ternary.png',
  categories: [BlockCategory.FINOPS],
  authors: ['Quilyx'],
  actions: [
    getDataIntegrations,
    getBudgets,
    createCustomApiCallAction({
      baseUrl: (auth: any) => `${auth.apiURL}/api/`,
      auth: ternaryCloudAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Ternary API documentation](https://docs.ternary.app/reference/api).',
        }),
      },
      additionalQueryParamsMapping: async ({ auth }: any) => ({
        tenantID: auth.tenantId,
      }),
      authMapping: async ({ auth }: any) => ({
        Authorization: `Bearer ${auth.apiKey}`,
      }),
    }),
  ],
  triggers: [],
});
