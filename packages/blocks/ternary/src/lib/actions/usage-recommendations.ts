import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getUsageRecommendations = createAction({
  name: 'get_usage_recommendations',
  displayName: 'Get usage recommendations',
  description: 'Fetch usage recommendations from Ternary.',
  auth: ternaryCloudAuth,
  props: {},
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'recommendations',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as object;
    } catch (e) {
      logger.error('Error getting usage recommendations.', e);
      throw e;
    }
  },
});
