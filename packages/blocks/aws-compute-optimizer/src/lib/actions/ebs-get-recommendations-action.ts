import { EBSFinding } from '@aws-sdk/client-compute-optimizer';
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
  getEbsRecommendationsForARNs,
  getEbsRecommendationsForARNsAllowPartial,
  getEbsRecommendationsForRegions,
  getEbsRecommendationsForRegionsAllowPartial,
} from '../common/compute-optimizer-ebs-client';

export const ebsGetRecommendationsAction = createAction({
  auth: amazonAuth,
  name: 'ebs_get_recommendations',
  description: 'Get EBS volume recommendations',
  displayName: 'EBS Get Recommendations',
  isWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    recommendationType: Property.StaticDropdown({
      displayName: 'Recommendations type',
      description: 'Type of recommendations to collect',
      options: {
        options: [
          {
            label: 'Migrate to latest generation',
            value: EBSFinding.OPTIMIZED,
          },
          // TODO: Differentiate between over and under provisioned volumes ?
          { label: 'Rightsize', value: EBSFinding.NOT_OPTIMIZED },
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
              return getEbsRecommendationsForARNsAllowPartial(
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
            getEbsRecommendationsForARNs(
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
            getEbsRecommendationsForRegionsAllowPartial(
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
        getEbsRecommendationsForRegions(creds, findingType, regions),
      );

      const recommendations = await Promise.all(promises);

      return recommendations.flat();
    } catch (error) {
      throw new Error(
        'An error occurred while requesting Ebs Volumes recommendations: ' +
          error,
      );
    }
  },
});

function getFindingType(context: any): EBSFinding {
  const findingType = context.propsValue.recommendationType;

  return findingType as EBSFinding;
}
