import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { assignResourceAction } from './lib/actions/assign-resource-action';
import { customApiCallAction } from './lib/actions/custom-api-call-action';
import { getAnomaliesAction } from './lib/actions/get-anomalies-action';
import { getDataSourcesAction } from './lib/actions/get-data-sources-action';
import { getEmployeesAction } from './lib/actions/get-employees-action';
import { getExpensesAction } from './lib/actions/get-expenses-action';
import { getExpensesBreakdownAction } from './lib/actions/get-expenses-breakdown-action';
import { getOrganizationsAction } from './lib/actions/get-organizations-action';
import { getPoolsAction } from './lib/actions/get-pools-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations-action';
import { getResourceAction } from './lib/actions/get-resource-action';
import { setPoolBudgetAction } from './lib/actions/set-pool-budget-action';
import { updateRecommendationStatusAction } from './lib/actions/update-recommendation-status-action';
import { optscaleAuth } from './lib/auth';

export const optscale = createBlock({
  displayName: 'OptScale',
  auth: optscaleAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/optscale.svg',
  authors: ['OpenOps'],
  categories: [BlockCategory.FINOPS],
  actions: [
    getOrganizationsAction,
    getDataSourcesAction,
    getRecommendationsAction,
    getResourceAction,
    getExpensesAction,
    getExpensesBreakdownAction,
    getAnomaliesAction,
    getPoolsAction,
    getEmployeesAction,
    updateRecommendationStatusAction,
    assignResourceAction,
    setPoolBudgetAction,
    customApiCallAction,
  ],
  triggers: [],
});
