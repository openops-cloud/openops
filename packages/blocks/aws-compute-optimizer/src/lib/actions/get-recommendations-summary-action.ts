import { createAction, Property } from '@openops/blocks-framework';
import {
  amazonAuth,
  convertToRegionsArrayWithValidation,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  regionsStaticMultiSelectDropdown,
} from '@openops/common';
import {
  getRecommendationSummaries,
  getRecommendationSummariesAllowPartial,
} from '../common/compute-optimizer-client';

export const getRecommendationsSummaryAction = createAction({
  auth: amazonAuth,
  name: 'get_recommendations_summary',
  description: 'Get account recommendations summary',
  displayName: 'Get Recommendations Summary',
  isWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    regions: regionsStaticMultiSelectDropdown(true).regions,
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
      const regions = convertToRegionsArrayWithValidation(
        context.propsValue.regions,
      );
      const partial = context.propsValue.allowPartialResults === true;
      const credentials = await getCredentialsListFromAuth(
        context.auth,
        accounts,
      );

      if (partial) {
        const partialOutcomes = await Promise.all(
          credentials.map((creds) =>
            getRecommendationSummariesAllowPartial(creds, regions),
          ),
        );

        return {
          results: partialOutcomes.flatMap((o) => o.results),
          failedRegions: partialOutcomes.flatMap((o) => o.failedRegions),
        };
      }

      const promises = credentials.map((creds) =>
        getRecommendationSummaries(creds, regions),
      );

      const recommendations = await Promise.all(promises);

      return recommendations.flat();
    } catch (error) {
      throw new Error(
        'An error occurred while requesting recommendations summary: ' + error,
      );
    }
  },
});
