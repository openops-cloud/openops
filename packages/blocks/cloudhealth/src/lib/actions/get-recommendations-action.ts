import {
  createAction,
  Property,
  StaticDropdownProperty,
} from '@openops/blocks-framework';
import { cloudhealthAuth } from '../auth';
import { executeGraphQLQuery } from '../common/execute-graphql-query';
import { getAwsAccounts } from '../common/get-aws-accounts';
import { getAzureSubscriptions } from '../common/get-azure-subscriptions';
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
      props: async ({ auth, recommendationType }: any) => {
        const mandatoryFieldNames =
          ASSET_CONFIGS[recommendationType as keyof typeof ASSET_CONFIGS]
            .mandatoryFields;

        if (!mandatoryFieldNames || mandatoryFieldNames.length === 0) {
          return {} as any;
        }

        const result: Record<string, any> = {};
        for (const field of mandatoryFieldNames) {
          switch (field) {
            case 'aws_account_id': {
              result['aws_account_id'] = await aws_account_id(auth);
              break;
            }
            case 'azure_subscription_id': {
              result['azure_subscription_id'] = await azure_subscription_id(
                auth,
              );
              break;
            }
            case 'cloud_provider':
              result['cloud_provider'] = cloud_provider();
              break;
            default:
              break;
          }
        }

        return result;
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

async function aws_account_id(
  apiKey: string,
): Promise<StaticDropdownProperty<string, boolean>> {
  let awsAccounts: unknown[] = [];
  let error: string | undefined;
  let disabled = false;

  try {
    awsAccounts = await getAwsAccounts(apiKey);
  } catch (e) {
    disabled = true;
    error = extractErrorMessage(e);
  }

  return Property.StaticDropdown({
    displayName: 'AWS Account ID',
    description: 'The AWS account ID to filter recommendations by.',
    required: false,
    options: {
      error: error,
      disabled: disabled,
      options: awsAccounts.map((account: any) => ({
        label: account.name,
        value: `${account.id}`,
      })),
    },
  });
}

async function azure_subscription_id(
  apiKey: string,
): Promise<StaticDropdownProperty<string, boolean>> {
  let azureSubscriptions: unknown[] = [];
  let error: string | undefined;
  let disabled = false;

  try {
    azureSubscriptions = await getAzureSubscriptions(apiKey);
  } catch (e) {
    disabled = true;
    error = extractErrorMessage(e);
  }

  return Property.StaticDropdown({
    displayName: 'Azure Subscription ID',
    description: 'The Azure subscription ID to filter recommendations by.',
    required: false,
    options: {
      error: error,
      disabled: disabled,
      options: azureSubscriptions.map((subscription: any) => ({
        label: subscription.name,
        value: `${subscription.id}`,
      })),
    },
  });
}

function cloud_provider(): StaticDropdownProperty<string, boolean> {
  return Property.StaticDropdown({
    displayName: 'Cloud Provider',
    description: 'The cloud provider to filter recommendations by.',
    required: true,
    options: {
      options: [
        { label: 'AWS', value: 'aws' },
        { label: 'Azure', value: 'azure' },
        { label: 'GCP', value: 'gcp' },
      ],
    },
  });
}

function extractErrorMessage(
  e: unknown,
  defaultMsg = 'An unknown error occurred',
): string {
  if (e instanceof Error && e.message) {
    return e.message;
  }

  if (typeof e === 'string' && e.trim() !== '') {
    return e;
  }
  return defaultMsg;
}
