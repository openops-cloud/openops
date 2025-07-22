import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getCases = createAction({
  name: 'get_cases',
  displayName: 'Get cases',
  description: 'Fetch cases from Ternary.',
  auth: ternaryCloudAuth,
  props: {},
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'cases',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as any[];
    } catch (e) {
      logger.error('Error getting case management cases.', e);
      throw e;
    }
  },
});
