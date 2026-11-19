import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { RiskLevel } from '@openops/shared';
import { optscaleAuth } from '../auth';
import { pathSegment, sendOptScaleRequest } from '../common/make-request';
import {
  getRecommendationTypeOptions,
  NON_DISMISSIBLE_RECOMMENDATION_TYPES,
  RECOMMENDATION_TYPES,
} from '../common/recommendation-types';

export const updateRecommendationStatusAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_update_recommendation_status',
  displayName: 'Dismiss or Activate Recommendation',
  description:
    'Dismiss a recommendation for a resource so it is no longer reported, or activate it again',
  isWriteAction: true,
  riskLevel: RiskLevel.LOW,
  props: {
    resourceId: Property.ShortText({
      displayName: 'Resource ID',
      description:
        'The OptScale resource ID (the "resource_id" field of the recommendation)',
      required: true,
    }),
    recommendationType: Property.StaticDropdown({
      displayName: 'Recommendation Type',
      required: true,
      options: {
        options: getRecommendationTypeOptions(
          RECOMMENDATION_TYPES.filter(
            (type) =>
              !NON_DISMISSIBLE_RECOMMENDATION_TYPES.includes(type.value),
          ),
        ),
      },
    }),
    action: Property.StaticDropdown<'dismiss' | 'activate', true>({
      displayName: 'Action',
      required: true,
      defaultValue: 'dismiss',
      options: {
        options: [
          { label: 'Dismiss', value: 'dismiss' },
          { label: 'Activate', value: 'activate' },
        ],
      },
    }),
  },
  async run(context) {
    const { resourceId, recommendationType, action } = context.propsValue;

    if (NON_DISMISSIBLE_RECOMMENDATION_TYPES.includes(recommendationType)) {
      throw new Error(
        `OptScale does not support dismissing or activating ${recommendationType} recommendations`,
      );
    }

    return sendOptScaleRequest({
      auth: context.auth,
      method: HttpMethod.PATCH,
      path: `/resources/${pathSegment(resourceId)}/optimizations`,
      body: { action, recommendation: recommendationType },
    });
  },
});
