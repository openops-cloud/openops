import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getCostAlerts = createAction({
  name: 'get_cost_alerts',
  displayName: 'Get Cost Alerts',
  description: 'Fetch the list of cost alerts.',
  auth: ternaryCloudAuth,
  props: {},
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'cost-alerts',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as any[];
    } catch (e) {
      logger.error('Error getting cost alert list.', e);
      throw e;
    }
  },
});
