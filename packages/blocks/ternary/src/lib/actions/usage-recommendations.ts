import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
// import recommendations from '../api-filters/recommendations.json';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getUsageRecommendations = createAction({
  name: 'get_usage_recommendations',
  displayName: 'Get usage recommendations',
  description: 'Fetch usage recommendations from Ternary.',
  auth: ternaryCloudAuth,
  props: {
    // cloudProvider: Property.Dropdown({
    //   displayName: 'Cloud provider',
    //   required: false,
    //   refreshers: ['auth'],
    //   options: async () => {
    //     // if (!auth) {
    //     //   return {
    //     //     options: [],
    //     //   };
    //     // }
    //     return {
    //       options: recommendations.providers.map((item) => {
    //         return {
    //           label: item.label,
    //           value: item.value,
    //         };
    //       }),
    //     };
    //   },
    // }),
  },
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'recommendations',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as object;
    } catch (e) {
      console.error('Error getting data integrations!');
      console.error(e);
      return e;
    }
  },
});

export const updateUsageRecommendations = createAction({
  name: 'update_usage_recommendations',
  displayName: 'Update usage recommendations',
  description: 'Update usage recommendations to Ternary.',
  auth: ternaryCloudAuth,
  props: {
    paramsArray: Property.Array({
      displayName: 'Recommendations',
      required: true,
      properties: {
        recommendationId: Property.ShortText({
          displayName: 'Recommendation ID',
          required: true,
        }),
        snoozeUntil: Property.DateTime({
          displayName: 'Snooze Until',
          description: 'Date and time to snooze the recommendation until.',
          required: true,
        }),
        state: Property.ShortText({
          displayName: 'State',
          description: 'State of the recommendation.',
          required: true,
        }),
      },
    }),
  },
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'recommendations',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as object;
    } catch (e) {
      console.error('Error getting data integrations!');
      console.error(e);
      return e;
    }
  },
});
