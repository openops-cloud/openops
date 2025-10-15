import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { sendTernaryRequest } from '../common/send-ternary-request';

export const getUsageRecommendations = createAction({
  name: 'get_usage_recommendations',
  displayName: 'Get Usage Recommendations',
  description: 'Get Usage Recommendations',
  auth: ternaryCloudAuth,
  isWriteAction: false,
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
