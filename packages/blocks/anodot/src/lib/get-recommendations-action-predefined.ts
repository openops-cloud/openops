import { createAction } from '@openops/blocks-framework';
import { accountProperty } from './account-property';
import { anadotAuth } from './anodot-auth-property';
import { closedAndDoneRecommendationsProperty } from './api-filters/closed-and-done-recommendations-property';
import { customStatusProperty } from './api-filters/custom-status-property';
import { getPredefinedRecommendationsDropdownProperty } from './api-filters/get-x-recommendation-property';
import { openedRecommendationsProperty } from './api-filters/opened-recommendations-property';
import { buildUserAccountApiKey } from './common/anodot-requests-helpers';
import { authenticateUserWithAnodot } from './common/auth';
import {
  addClosedAndDoneDateFilters,
  addCustomStatusFilters,
  addFilterIfValid,
  buildBaseRecommendationsRequestFilters,
} from './common/build-recommendation-filters-common';
import { getAnodotRecommendations } from './common/recommendations';
import { RecommendationsRequestFilters } from './common/recommendations-request-filters';

export const getRecommendationsAction = createAction({
  auth: anadotAuth,
  name: 'get_recommendations_predefined',
  description: 'Get Umbrella recommendations',
  displayName: 'Get Recommendations',
  props: {
    accounts: accountProperty(),

    recommendationTypes: getPredefinedRecommendationsDropdownProperty(),

    customStatus: customStatusProperty(),

    openedRecommendations: openedRecommendationsProperty(),

    closedAndDoneRecommendations: closedAndDoneRecommendationsProperty(),
  },
  async run(context) {
    try {
      const { authUrl, apiUrl, username, password } = context.auth;

      const accounts = context.propsValue.accounts as any[];
      const recommendationTypes = context.propsValue.recommendationTypes as
        | { filters: { type_id: string[] } }[]
        | undefined;

      const props = {
        ...context.propsValue,
        statusFilter: 'potential_savings',
      };

      const filters: RecommendationsRequestFilters =
        buildBaseRecommendationsRequestFilters(props);

      addCustomStatusFilters(filters, context.propsValue);
      addClosedAndDoneDateFilters(filters, context.propsValue);

      if (recommendationTypes) {
        const filterTypes: Record<string, string[]> = {};
        for (const type of recommendationTypes) {
          for (const [key, value] of Object.entries(type.filters)) {
            filterTypes[key] = filterTypes[key] || [];
            filterTypes[key].push(...value);
          }
        }

        for (const [key, value] of Object.entries(filterTypes)) {
          addFilterIfValid(filters, key, { eq: value, negate: false });
        }
      }

      const anodotTokens = await authenticateUserWithAnodot(
        authUrl,
        username,
        password,
      );

      const result: Record<string, any> = {};
      for (const selectedAccount of accounts) {
        const accountApiKey = buildUserAccountApiKey(
          anodotTokens.apikey,
          selectedAccount.accountKey,
          selectedAccount.divisionId,
        );

        result[selectedAccount.accountName] = await getAnodotRecommendations(
          apiUrl,
          anodotTokens.Authorization,
          accountApiKey,
          filters,
        );
      }

      return result;
    } catch (error) {
      throw new Error(
        'An error occurred while requesting Anodot recommendations. Error Message: ' +
          (error as any).response?.data?.message,
      );
    }
  },
});
