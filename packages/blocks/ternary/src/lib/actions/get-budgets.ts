import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getBudgets = createAction({
  name: 'get_budgets',
  displayName: 'Get budgets',
  description: 'Fetch budgets from Ternary.',
  auth: ternaryCloudAuth,
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
    } catch (e) {
      console.error('Error getting budgets!');
      console.error(e);
      return e;
    }
  },
});
