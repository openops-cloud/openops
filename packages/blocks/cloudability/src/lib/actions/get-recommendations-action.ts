import { createAction, Property } from '@openops/blocks-framework';
import { cloudabilityAuth } from '../auth';
import {
  getRecommendationTypesProperty,
  getVendorsProperty,
} from '../common/common-properties';
import {
  CostBasis,
  Duration,
  getRecommendations,
  SnoozedFilter,
} from '../common/recommendations-api';

export const getRecommendationsAction = createAction({
  name: `cloudability_get_recommendations`,
  displayName: `Get Recommendations`,
  description: `Get Recommendations`,
  auth: cloudabilityAuth,
  isWriteAction: false,
  props: {
    ...getVendorsProperty(),
    ...getRecommendationTypesProperty(),
    duration: Property.StaticDropdown({
      displayName: 'Look-Back Period',
      description:
        'The look back period in days, used for calculating the recommendations.',
      required: true,
      defaultValue: Duration.TenDay,
      options: {
        options: [
          { label: 'Last 10 Days', value: Duration.TenDay },
          { label: 'Last 30 Days', value: Duration.ThirtyDay },
        ],
      },
    }),
    basis: Property.StaticDropdown({
      displayName: 'Cost Basis',
      description: 'The cost basis for the recommendations.',
      required: true,
      defaultValue: CostBasis.OnDemand,
      options: {
        options: [
          { label: 'On-Demand', value: CostBasis.OnDemand },
          { label: 'Effective', value: CostBasis.Effective },
        ],
      },
    }),
    snoozedFilter: Property.StaticDropdown({
      displayName: 'Recommendations Status',
      description: 'Whether to include recommendations that have been snoozed.',
      required: true,
      defaultValue: SnoozedFilter.NO_SNOOZED,
      options: {
        options: [
          { label: 'Show Only Active', value: SnoozedFilter.NO_SNOOZED },
          {
            label: 'Show All (including snoozed)',
            value: SnoozedFilter.INCLUDE_SNOOZED,
          },
          { label: 'Show Only Snoozed', value: SnoozedFilter.ONLY_SNOOZED },
        ],
      },
    }),
    limit: Property.ShortText({
      displayName: 'Limit',
      description: 'The maximum number of recommendations to return.',
      required: false,
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
      snoozedFilter,
    } = context.propsValue;
    const { auth } = context;

    const result = await getRecommendations({
      auth,
      vendor: vendor,
      recommendationType: recommendationType,
      duration: duration,
      limit,
      filters: additionalFilters as string[],
      basis: basis,
      snoozedFilter: snoozedFilter,
    });

    return result;
  },
});
