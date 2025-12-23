import { createCustomApiCallAction } from '@openops/blocks-common';
import { createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { archeraAuth } from './auth';
import { applyCommitmentPlanAction } from './lib/actions/apply-plan';
import { getCommitmentsInventoryAction } from './lib/actions/get-commitment-inventory';
import { getCommitmentPlanAction } from './lib/actions/get-commitment-plan';
import { getDefaultCommitmentPlansAction } from './lib/actions/get-default-plans';
import { getMetricsAction } from './lib/actions/get-metrics';
import { getRecommendedPlan } from './lib/actions/get-recommendations-action';

export const archera = createBlock({
  displayName: 'Archera',
  auth: archeraAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/archera.svg',
  categories: [BlockCategory.FINOPS],
  authors: ['Archera'],
  actions: [
    getRecommendedPlan,
    getDefaultCommitmentPlansAction,
    getCommitmentPlanAction,
    applyCommitmentPlanAction,
    getCommitmentsInventoryAction,
    getMetricsAction,
    createCustomApiCallAction({
      baseUrl: (auth: any) => `https://api.archera.ai/v1/org/${auth.orgId}`,
      auth: archeraAuth,
      additionalProps: {
        documentation: Property.MarkDown({
          value:
            'For more information, visit the [Archera API documentation](https://api.archera.ai/docs).',
        }),
      },
      authMapping: async (context) => ({
        'x-api-key': (context.auth as any).apiToken,
      }),
    }),
  ],
  triggers: [],
});
