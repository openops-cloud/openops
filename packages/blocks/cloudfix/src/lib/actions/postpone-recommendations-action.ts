import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const postponeRecommendationsAction = createAction({
  name: 'postpone_recommendations',
  displayName: 'Postpone Recommendations',
  description: 'Postpone recommendations until a specified date',
  auth: cloudfixAuth,
  isWriteAction: true,
  props: {
    recommendationIds: Property.Array({
      displayName: 'Recommendation IDs',
      description: 'Array of recommendation IDs to postpone',
      required: true,
    }),
    postponeUntil: Property.DateTime({
      displayName: 'Postpone until',
      description:
        'The date and time until which to postpone the recommendations. Format ISO yyyy-mm-ddT00:00:00.000Z.',
      required: true,
    }),
    reason: Property.ShortText({
      displayName: 'Reason',
      description: 'The reason for postponing the recommendations',
      required: false,
    }),
  },
  async run(context) {
    const { recommendationIds, postponeUntil, reason } = context.propsValue;

    const body = {
      recommendationIds: recommendationIds,
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
