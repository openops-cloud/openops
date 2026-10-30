import { createAction } from '@openops/blocks-framework';
import { tryParseJson } from '@openops/common';
import { accountProperty } from './account-property';
import { anadotAuth } from './anodot-auth-property';
import { closedAndDoneRecommendationsProperty } from './api-filters/closed-and-done-recommendations-property';
import { customStatusProperty } from './api-filters/custom-status-property';
import { getPredefinedRecommendationsDropdownProperty } from './api-filters/get-predefined-recommendation-property';
import { openedRecommendationsProperty } from './api-filters/opened-recommendations-property';
import type { SelectedAccount } from './common/account';
import { buildAccountApiKeyForAccount } from './common/anodot-requests-helpers';
import { createUmbrellaSession } from './common/auth';
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
  isWriteAction: false,
  props: {
    accounts: accountProperty(),

    recommendationTypes: getPredefinedRecommendationsDropdownProperty(),

    customStatus: customStatusProperty(),

    openedRecommendations: openedRecommendationsProperty(),

    closedAndDoneRecommendations: closedAndDoneRecommendationsProperty(),
  },
  async run(context) {
    try {
      const rawAccounts = context.propsValue.accounts as unknown;
      let parsedAccounts = rawAccounts;
      if (typeof rawAccounts === 'string') {
        parsedAccounts = tryParseJson(rawAccounts);
      }
      const accounts: SelectedAccount[] = Array.isArray(parsedAccounts)
        ? (parsedAccounts as SelectedAccount[])
        : ([parsedAccounts] as SelectedAccount[]);

      const recommendationTypes = context.propsValue.recommendationTypes as
        string[] | undefined;

      const props = {
        ...context.propsValue,
        statusFilter: 'potential_savings',
      };

      const filters: RecommendationsRequestFilters =
        buildBaseRecommendationsRequestFilters(props);

      addCustomStatusFilters(filters, context.propsValue);
      addClosedAndDoneDateFilters(filters, context.propsValue);

      if (recommendationTypes) {
        addFilterIfValid(filters, 'type_id', {
          eq: recommendationTypes,
          negate: false,
        });
      }

      const session = await createUmbrellaSession(context.auth);

      const result: Record<string, any> = {};
      for (const selectedAccount of accounts) {
        const accountApiKey = buildAccountApiKeyForAccount(
          session.tokens.apikey,
          selectedAccount,
        );

        result[selectedAccount.accountName] = await getAnodotRecommendations(
          session.apiUrl,
          session.tokens.Authorization,
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
