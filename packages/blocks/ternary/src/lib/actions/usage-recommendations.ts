import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import recommendations from '../api-filters/recommendations.json';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getUsageRecommendations = createAction({
  name: 'get_usage_recommendations',
  displayName: 'Get usage recommendations',
  description: 'Fetch usage recommendations from Ternary.',
  auth: ternaryCloudAuth,
  props: {
    cloudProvider: Property.Dropdown({
      displayName: 'Cloud provider',
      description: 'Additional filters, leave empty for all recommendations',
      required: false,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            options: [],
          };
        }
        return {
          options: recommendations.providers.map((item) => {
            return {
              label: item.label,
              value: item.value,
            };
          }),
        };
      },
    }),
    resourceType: Property.Dropdown({
      displayName: 'Resource type',
      description: 'Required if cloud provider is selected',
      required: false,
      refreshers: ['auth', 'cloudProvider'],
      options: async ({ auth, cloudProvider }) => {
        const provider = recommendations.providers.find(
          (item) => item.value === cloudProvider,
        );
        if (!auth || !cloudProvider || !provider) {
          return {
            options: [],
            disabled: true,
            placeholder: 'Select a cloud provider first',
          };
        }

        return {
          options: provider.categories.map((category) => ({
            label: category.label,
            value: category.value,
          })),
        };
      },
    }),
  },
  run: async ({ auth, propsValue }) => {
    const { cloudProvider, resourceType } = propsValue;

    let queryParams = {
      tenantID: auth.tenantId,
    } as any;
    if (cloudProvider && resourceType) {
      const provider = recommendations.providers.find(
        (item) => item.value === cloudProvider,
      );
      const category = provider?.categories.find(
        (cat) => cat.value === resourceType,
      );
      const serviceType = category?.serviceType;
      queryParams = {
        ...queryParams,
        kind: 'recommendation',
        provider: cloudProvider,
        category: resourceType,
        serviceType: serviceType,
      };
    }

    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'recommendations',
        queryParams,
      });
      return response.body as object;
    } catch (e) {
      console.error('Error getting usage recommendations');
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
          description:
            'Date and time to snooze the recommendation until. Use a "Date Operations" block or enter a date in the format "YYYY-MM-DDTHH:mm:ss.sssZ".',
          required: true,
        }),
        state: Property.ShortText({
          displayName: 'State',
          description: 'Custom state of the recommendation.',
          required: true,
        }),
      },
    }),
  },
  run: async ({ auth }) => {
    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.PATCH,
        url: 'recommendations',
        queryParams: {
          tenantID: auth.tenantId,
        },
      });
      return response.body as object;
    } catch (e) {
      console.error('Error updating usage recommendations');
      console.error(e);
      return e;
    }
  },
});
