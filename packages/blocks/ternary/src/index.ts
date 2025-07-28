import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createCaseAction } from './lib/actions/create-case';
import { getBudgets } from './lib/actions/get-budgets';
import { getCasesAction } from './lib/actions/get-cases';
import { getAnomaliesAction } from './lib/actions/get-cost-alerts';
import { getDataIntegrations } from './lib/actions/get-data-integrations';
import { getUsers } from './lib/actions/get-users';
import { getUsageRecommendations } from './lib/actions/usage-recommendations';
import { ternaryCloudAuth } from './lib/common/auth';

export const ternary = createBlock({
  displayName: 'Ternary',
  auth: ternaryCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/ternary.png',
  categories: [BlockCategory.FINOPS],
  authors: ['Quilyx'],
  actions: [
    getBudgets,
    getAnomaliesAction,
    getUsageRecommendations,
    getDataIntegrations,
    getCasesAction,
    createCaseAction,
    getUsers,
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
