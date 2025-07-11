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
    additionalFilters: Property.DynamicProperties({
      displayName: 'Additional Filters',
      description: 'Additional filters to apply to the recommendations.',
      required: false,
      refreshers: ['recommendationType'],
      props: async (context: any) => {
        const { recommendationType } = context.propsValue as any;

        const mandatoryFields =
          ASSET_CONFIGS[recommendationType as keyof typeof ASSET_CONFIGS]
            .mandatoryFields;

        if (!mandatoryFields) {
          return {} as any;
        }

        return mandatoryFields.reduce((acc, key) => {
          if (key in MANDATORY_FIELDS) {
            acc[key] = MANDATORY_FIELDS[key as keyof typeof MANDATORY_FIELDS];
          }
          return acc;
        }, {} as Record<string, (typeof MANDATORY_FIELDS)[keyof typeof MANDATORY_FIELDS]>);
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
  },
  async run(context) {
    const { recommendationType, additionalFilters, evaluationDuration } =
      context.propsValue as any;

    const { query, variables } = generateQuery(
      recommendationType,
      additionalFilters,
      evaluationDuration,
    );

    const apiKey = context.auth;

    return await executeGraphQLQuery({
      query,
      variables,
      apiKey,
    });
  },
});

export const MANDATORY_FIELDS = {
  aws_account_id: Property.Dropdown({
    displayName: 'AWS Account ID',
    description: 'The AWS account ID for the asset.',
    required: true,
    refreshers: ['auth', 'recommendationType'],
    options: async ({ auth }: any) => {
      return [] as any;
    },
  }),
  azure_subscription_id: Property.Dropdown({
    displayName: 'Azure Subscription ID',
    description: 'The Azure subscription ID for the asset.',
    required: true,
    refreshers: ['auth', 'recommendationType'],
    options: async ({ auth }: any) => {
      return [] as any;
    },
  }),
  cloud_provider: Property.StaticDropdown({
    displayName: 'Cloud Provider',
    description: 'The cloud provider for the asset.',
    required: true,
    options: {
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'Azure', value: 'azure' },
        { label: 'GCP', value: 'gcp' },
      ],
    },
  }),
};
