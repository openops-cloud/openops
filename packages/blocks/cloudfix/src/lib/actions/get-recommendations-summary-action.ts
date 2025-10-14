import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const getRecommendationsSummaryAction = createAction({
  name: 'get_recommendations_summary',
  displayName: 'Get Recommendations Summary',
  description: 'Get a summary of recommendations',
  auth: cloudfixAuth,
  isWriteAction: false,
  props: {},
  async run(context) {
    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: '/recommendations/summary',
      method: HttpMethod.GET,
    });

    return response;
  },
});
