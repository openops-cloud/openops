import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getDataIntegrations = createAction({
  name: 'get_data_integrations',
  displayName: 'Get data integrations',
  description: 'Fetch data integrations from Ternary.',
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
    } catch (e) {
      console.error('Error getting data integrations!');
      console.error(e);
      return e;
    }
  },
});
