import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { sendTernaryRequest } from '../common/send-ternary-request';

export const getBudgets = createAction({
  name: 'get_budgets',
  displayName: 'Get Budgets',
  description: 'Get Budgets',
  auth: ternaryCloudAuth,
  requireToolApproval: false,
  props: {},
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'budgets',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as any[];
    } catch (error) {
      logger.error('Error getting budgets.', error);
      throw error;
    }
  },
});
