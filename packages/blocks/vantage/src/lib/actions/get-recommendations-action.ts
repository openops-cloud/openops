import { createAction, Property } from '@openops/blocks-framework';
import { vantageAuth } from '../auth';
import { getIntegrations, getProviders } from '../common/integrations-api';
import {
  getCategories,
  getRecommendations,
} from '../common/recommendations-api';

export const getRecommendationsAction = createAction({
  auth: vantageAuth,
  name: 'vantage_get_active_recommendations',
  description: 'Get Recommendations',
  displayName: 'Get Recommendations',
  props: {
    category: Property.Dropdown({
      displayName: 'Category',
      description: 'Filter recommendations by category',
      required: false,
      refreshers: [],
      options: async () => {
        const categories = await getCategories();

        return {
          disabled: false,
          options: categories,
        };
      },
    }),
    provider: Property.Dropdown({
      displayName: 'Provider',
      description: 'Filter integrations by provider',
      required: false,
      refreshers: [],
      options: async () => {
        const providers = await getProviders();

        return {
          disabled: false,
          options: providers,
        };
      },
    }),
    accountId: Property.DynamicProperties({
      displayName: 'Account ID',
      description: 'Filter recommendations by provider account ID',
      required: false,
      refreshers: ['provider'],
      props: async ({ auth, provider }) => {
        if (!auth || !provider) {
          return {} as any;
        }

        const providerIntegrations = await getIntegrations(
          auth,
          provider as any,
        );

        if (!providerIntegrations.integrations.length) {
          return {
            markdown: Property.MarkDown({
              value:
                'Cannot filter by provider: there are no existing integrations for the given provider',
            }),
          };
        }

        const options = providerIntegrations.integrations.map((account) => ({
          label: account.account_identifier,
          value: account.account_identifier,
        }));

        return {
          accountId: Property.StaticDropdown({
            displayName: 'Account ID',
            description: 'Select an account to filter recommendations',
            required: true,
            options: {
              options: options,
              disabled: false,
            },
          }),
        };
      },
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'The maximum number of recommendations to return',
      required: false,
    }),
  },
  async run(context) {
    const { category, limit, accountId } = context.propsValue;

    const recommendations = await getRecommendations(
      context.auth,
      category,
      accountId ? accountId['accountId'] : undefined,
      limit,
    );

    return recommendations;
  },
});
