import { createAction, Property } from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { executeGraphQLQuery } from '../common/execute-graphql-query';
import {
  ASSET_CONFIGS,
  generateQuery,
} from '../common/rightsizing-recommendations-factory';

export const getRecommendationsAction = createAction({
  name: 'cloudhealth_get_recommendations',
  displayName: 'Get Recommendations',
  description: 'Get Recommendations',
  auth: cloudhealthAuth,
  requireToolApproval: false,
  props: {
    recommendationType: Property.StaticDropdown({
      displayName: 'Recommendation Type',
      description: 'The type of recommendation to fetch.',
      required: true,
      options: {
        options: Object.entries(ASSET_CONFIGS).map(([key, value]) => ({
          label: value.label,
          value: key,
        })),
      },
    }),
    evaluationDuration: Property.StaticDropdown({
      displayName: 'Evaluation Duration',
      description: 'The duration for which to get the recommendations.',
      required: true,
      options: {
        options: [
          { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
          { label: 'Last 14 Days', value: 'LAST_14_DAYS' },
          { label: 'Last 30 Days', value: 'LAST_30_DAYS' },
          { label: 'Last 60 Days', value: 'LAST_60_DAYS' },
          { label: 'Last 4 Weeks', value: 'LAST_4_WEEKS' },
          { label: 'Previous Month', value: 'PREV_MONTH' },
        ],
      },
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'The maximum number of recommendations to return.',
      required: false,
      defaultValue: undefined,
    }),
  },
  async run(context) {
    const { recommendationType, evaluationDuration, limit } =
      context.propsValue as any;

    const { query, variables } = generateQuery(
      recommendationType,
      {},
      evaluationDuration,
      { first: limit },
    );

    const apiKey = context.auth;

    return await executeGraphQLQuery({
      query,
      variables,
      apiKey,
    });
  },
});
