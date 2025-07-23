import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getBudgets } from './lib/actions/get-budgets';
import { getCases } from './lib/actions/get-cases';
import { getCostAlerts } from './lib/actions/get-cost-alerts';
import { getDataIntegrations } from './lib/actions/get-data-integrations';
import { getUsageRecommendations } from './lib/actions/usage-recommendations';
import { ternaryCloudAuth } from './lib/common/auth';
import { createCase } from './lib/actions/create-case';

export const ternary = createBlock({
  displayName: 'Ternary',
  description: 'FinOps multi-cloud analytics platform.',
  auth: ternaryCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/ternary.png',
  categories: [BlockCategory.FINOPS],
  authors: ['Quilyx'],
  actions: [
    getDataIntegrations,
    getBudgets,
    getCases,
    createCase,
    getCostAlerts,
    getUsageRecommendations,
    createCustomApiCallAction({
      baseUrl: (auth: unknown) => (auth as { apiURL: string }).apiURL,
      auth: ternaryCloudAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Ternary API documentation](https://docs.ternary.app/reference/api).',
        }),
      },
      authMapping: async ({ auth }: any) => {
        return {
          Authorization: `Bearer ${auth.apiKey}`,
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
  triggers: [],
});
