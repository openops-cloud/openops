import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const getReportAction = createAction({
  name: 'get_report',
  displayName: 'Get Report',
  description: 'Get a report for a specific recommendation.',
  auth: cloudfixAuth,
  props: {
    recommendationId: Property.ShortText({
      displayName: 'Recommendation ID',
      description: 'The ID of the recommendation to get a report for',
      required: true,
    }),
  },
  async run(context) {
    const recommendationId = context.propsValue.recommendationId;

    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: `/recommendations/report?recommendationId=${recommendationId}`,
      method: HttpMethod.GET,
    });

    return response;
  },
});
