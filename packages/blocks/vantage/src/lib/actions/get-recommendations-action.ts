import { createAction, Property, Validators } from '@openops/blocks-framework';
import { vantageAuth } from '../auth';
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
    limit: Property.Number({
      displayName: 'Limit',
      description: 'The maximum number of recommendations to return',
      required: false,
    }),
  },
  async run(context) {
    const category = context.propsValue.category;
    const limit = context.propsValue.limit;
    const recommendations = await getRecommendations(
      context.auth,
      category,
      limit,
    );

    return recommendations;
  },
});
