import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { getAnomaliesAction } from './lib/actions/get-anomalies-action';
import { getDataSourcesAction } from './lib/actions/get-data-sources-action';
import { getEmployeesAction } from './lib/actions/get-employees-action';
import { getExpensesAction } from './lib/actions/get-expenses-action';
import { getExpensesBreakdownAction } from './lib/actions/get-expenses-breakdown-action';
import { getOrganizationsAction } from './lib/actions/get-organizations-action';
import { getPoolsAction } from './lib/actions/get-pools-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations-action';
import { getResourceAction } from './lib/actions/get-resource-action';
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
  ],
  triggers: [],
});
