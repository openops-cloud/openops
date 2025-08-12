import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { sendTernaryRequest } from '../common/send-ternary-request';

export const getDataIntegrations = createAction({
  name: 'get_data_integrations',
  displayName: 'Get Data Integrations',
  description: 'Get Data Integrations',
  auth: ternaryCloudAuth,
  props: {},
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'data-integrations',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as object;
    } catch (error) {
      logger.error('Error getting data integrations!', error);
      throw error;
    }
  },
});
