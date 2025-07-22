import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const postponeRecommendationsAction = createAction({
  name: 'cloudfix_postpone_recommendations',
  displayName: 'Postpone Recommendations',
  description: 'Postpone recommendations until a specified date.',
  auth: cloudfixAuth,
  props: {
    recommendationIds: Property.Array({
      displayName: 'Recommendation IDs',
      description: 'Array of recommendation IDs to postpone',
      required: true,
      properties: {
        recommendationId: Property.ShortText({
          displayName: 'Recommendation ID',
          description: 'The ID of the recommendation',
          required: true,
        }),
      },
    }),
    postponeUntil: Property.DateTime({
      displayName: 'Postpone Until',
      description:
        'The date and time until which to postpone the recommendations. Format ISO yyyy-mm-ddT00:00:00.000Z',
      required: true,
    }),
    reason: Property.ShortText({
      displayName: 'Reason',
      description: 'The reason for postponing the recommendations',
      required: false,
    }),
    // TODO: add property list for how long
  },
  async run(context) {
    const recommendationIds = context.propsValue['recommendationIds'] as any[];
    const postponeUntil = context.propsValue['postponeUntil'] as string;
    const reason = context.propsValue['reason'] as string;

    const body = {
      recommendationIds: recommendationIds.map((item) => item.recommendationId),
      postponeUntil: new Date(postponeUntil).getTime(),
      reason,
    };

    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: '/recommendations/postpone',
      method: HttpMethod.POST,
      body,
    });

    return response;
  },
});
