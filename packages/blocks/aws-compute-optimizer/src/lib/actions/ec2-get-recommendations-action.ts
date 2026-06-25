import { Finding } from '@aws-sdk/client-compute-optimizer';
import {
  createAction,
  DynamicPropsValue,
  Property,
} from '@openops/blocks-framework';
import {
  amazonAuth,
  convertToARNArrayWithValidation,
  convertToRegionsArrayWithValidation,
  getARNsProperty,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsForAccount,
  getCredentialsListFromAuth,
  getRegionsDropdownState,
  groupARNsByAccount,
} from '@openops/common';
import {
  getEC2RecommendationsForARNs,
  getEC2RecommendationsForARNsAllowPartial,
  getEC2RecommendationsForRegions,
  getEC2RecommendationsForRegionsAllowPartial,
} from '../common/compute-optimizer-ec2-client';

export const ec2GetRecommendationsAction = createAction({
  auth: amazonAuth,
  name: 'ec2_get_recommendations',
  description: 'Get EC2 instance recommendations',
  displayName: 'EC2 Get Recommendations',
  isWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    recommendationType: Property.StaticDropdown({
      displayName: 'Recommendations type',
      description: 'Type of recommendations to collect',
      options: {
        options: [
          { label: 'Migrate to latest generation', value: Finding.OPTIMIZED },
          {
            label: 'Rightsize (Overprovisioned)',
            value: Finding.OVER_PROVISIONED,
          },
          {
            label: 'Rightsize (Underprovisioned)',
            value: Finding.UNDER_PROVISIONED,
          },
        ],
      },
      required: true,
    }),
    filterByARNs: Property.Checkbox({
      displayName: 'Filter by Resource ARNs',
      description: `If enabled, recommendations will be fetched only for resources that match the given ARNs`,
      required: true,
      defaultValue: false,
    }),
    filterProperty: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['filterByARNs'],
      props: async ({ filterByARNs }) => {
        const props: DynamicPropsValue = {};
        if (!filterByARNs) {
          const dropdownState = getRegionsDropdownState();
          props['regions'] = Property.StaticMultiSelectDropdown({
            displayName: 'Regions',
            description: 'A list of AWS regions.',
            required: true,
            options: dropdownState,
          });

          return props;
        }

        props['resourceARNs'] = getARNsProperty();

        return props;
      },
    }),
    allowPartialResults: Property.Checkbox({
      displayName: 'Allow Partial Results',
      description:
        'When enabled, the step returns partial results if the operation fails in some selected regions.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    try {
      const accounts = context.propsValue['accounts']['accounts'] as unknown as
        | string[]
        | undefined;
      const findingType = getFindingType(context);
      const resourceArns = context.propsValue.filterProperty['resourceARNs'];
      const partial = context.propsValue.allowPartialResults === true;

      if (resourceArns) {
        const arns = convertToARNArrayWithValidation(resourceArns);
        const groupedARNs = groupARNsByAccount(arns);

        if (partial) {
          const partialOutcomes = await Promise.all(
            Object.keys(groupedARNs).map(async (accountId) => {
              const arnsForAccount = groupedARNs[accountId];
              const credentials = await getCredentialsForAccount(
                context.auth,
                accountId,
              );
              return getEC2RecommendationsForARNsAllowPartial(
                credentials,
                findingType,
                arnsForAccount,
              );
            }),
          );

          return {
            results: partialOutcomes.flatMap((o) => o.results),
            failedRegions: partialOutcomes.flatMap((o) => o.failedRegions),
          };
        }

        const promises = [];

        for (const accountId in groupedARNs) {
          const arnsForAccount = groupedARNs[accountId];
          const credentials = await getCredentialsForAccount(
            context.auth,
            accountId,
          );
          promises.push(
            getEC2RecommendationsForARNs(
              credentials,
              findingType,
              arnsForAccount,
            ),
          );
        }

        const recommendations = await Promise.all(promises);

        return recommendations.flat();
      }

      const regions = convertToRegionsArrayWithValidation(
        context.propsValue.filterProperty['regions'],
      );
      const credentials = await getCredentialsListFromAuth(
        context.auth,
        accounts,
      );

      if (partial) {
        const partialOutcomes = await Promise.all(
          credentials.map((creds) =>
            getEC2RecommendationsForRegionsAllowPartial(
              creds,
              findingType,
              regions,
            ),
          ),
        );

        return {
          results: partialOutcomes.flatMap((o) => o.results),
          failedRegions: partialOutcomes.flatMap((o) => o.failedRegions),
        };
      }

      const promises = credentials.map((creds) =>
        getEC2RecommendationsForRegions(creds, findingType, regions),
      );

      const recommendations = await Promise.all(promises);
      return recommendations.flat();
    } catch (error) {
      throw new Error(
        'An error occurred while requesting EC2 recommendations: ' + error,
      );
    }
  },
});

function getFindingType(context: any): Finding {
  const findingType = context.propsValue.recommendationType;

  return findingType as Finding;
}
