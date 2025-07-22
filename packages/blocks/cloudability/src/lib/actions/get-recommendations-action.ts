import { createAction, Property, Validators } from '@openops/blocks-framework';
import { cloudabilityAuth } from '../auth';
import {
  getRecommendationTypesProperty,
  getVendorsProperty,
} from '../common/common-properties';
import {
  CostBasis,
  Duration,
  getRecommendations,
  IncludeSnoozed,
  Vendor,
} from '../common/recommendations-api';

export const getRecommendationsAction = createAction({
  name: `cloudability_get_recommendations`,
  displayName: `Get Recommendations`,
  description: `Get Recommendations`,
  auth: cloudabilityAuth,
  props: {
    ...getVendorsProperty(),
    ...getRecommendationTypesProperty(),
    duration: Property.StaticDropdown({
      displayName: 'Look-Back Period',
      description:
        'The look back period in days, used for calculating the recommendations.',
      required: true,
      defaultValue: 'ten-day',
      options: {
        options: [
          { label: 'Last 10 Days', value: 'ten-day' },
          { label: 'Last 30 Days', value: 'thirty-day' },
        ],
      },
    }),
    basis: Property.StaticDropdown({
      displayName: 'Cost Basis',
      description: 'The cost basis for the recommendations.',
      required: true,
      defaultValue: 'on-demand',
      options: {
        options: [
          { label: 'On-Demand', value: 'on-demand' },
          { label: 'Effective', value: 'effective' },
        ],
      },
    }),
    includeSnoozed: Property.StaticDropdown({
      displayName: 'Recommendations Status',
      description: 'Whether to include recommendations that have been snoozed.',
      required: true,
      defaultValue: 'NO_SNOOZED',
      options: {
        options: [
          { label: 'Show Only Active', value: 'NO_SNOOZED' },
          { label: 'Show All (including snoozed)', value: 'INCLUDE_SNOOZED' },
          { label: 'Show Only Snoozed', value: 'ONLY_SNOOZED' },
        ],
      },
    }),
    limit: Property.ShortText({
      displayName: 'Limit',
      description: 'The maximum number of recommendations to return.',
      required: false,
      defaultValue: undefined,
    }),
    additionalFilters: Property.Array({
      displayName: 'Additional Filters',
      description:
        'Additional filters to apply to the recommendations. See more at https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-rightsizing-end-points',
      required: false,
    }),
  },
  async run(context) {
    const {
      vendor,
      recommendationType,
      duration,
      limit,
      additionalFilters,
      basis,
      includeSnoozed,
    } = context.propsValue;
    const { auth } = context;

    const result = await getRecommendations({
      auth,
      vendor: vendor as Vendor,
      recommendationType: recommendationType,
      duration: duration as Duration,
      limit,
      filters: additionalFilters as string[],
      basis: basis as CostBasis,
      includeSnoozed: includeSnoozed as IncludeSnoozed,
    });

    return result;
  },
});
