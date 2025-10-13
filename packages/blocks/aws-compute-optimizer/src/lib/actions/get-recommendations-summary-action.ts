import { createAction } from '@openops/blocks-framework';
import {
  amazonAuth,
  convertToRegionsArrayWithValidation,
  getAwsAccountsMultiSelectDropdown,
  getCredentialsListFromAuth,
  regionsStaticMultiSelectDropdown,
} from '@openops/common';
import { getRecommendationSummaries } from '../common/compute-optimizer-client';

export const getRecommendationsSummaryAction = createAction({
  auth: amazonAuth,
  name: 'get_recommendations_summary',
  description: 'Get account recommendations summary',
  displayName: 'Get Recommendations Summary',
  IsWriteAction: false,
  props: {
    accounts: getAwsAccountsMultiSelectDropdown().accounts,
    regions: regionsStaticMultiSelectDropdown(true).regions,
  },
  async run(context) {
    try {
      const accounts = context.propsValue['accounts']['accounts'] as unknown as
        | string[]
        | undefined;
      const regions = convertToRegionsArrayWithValidation(
        context.propsValue.regions,
      );
      const credentials = await getCredentialsListFromAuth(
        context.auth,
        accounts,
      );

      const promises = credentials.map((credentials) => {
        return getRecommendationSummaries(credentials, regions);
      });

      const recommendations = await Promise.all(promises);

      return recommendations.flat();
    } catch (error) {
      throw new Error(
        'An error occurred while requesting recommendations summary: ' + error,
      );
    }
  },
});
