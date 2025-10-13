import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const getRecommendedPlan = createAction({
  auth: archeraAuth,
  name: 'archera_get_recommended_plan',
  description: 'Get recommended Archera commitment plan for a given provider',
  displayName: 'Get Recommended Plan',
  IsWriteAction: false,
  props: {
    provider: Property.StaticDropdown({
      displayName: 'Provider',
      description: 'The cloud provider to fetch recommendations for.',
      required: true,
      options: {
        options: [
          { label: 'AWS', value: 'aws' },
          { label: 'Azure', value: 'azure' },
        ],
      },
    }),
  },
  async run(context) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.archera.ai/v1/org/${context.auth.orgId}/commitment-plans/recommended`,
      headers: {
        'x-api-key': context.auth.apiToken,
      },
      queryParams: {
        provider: context.propsValue.provider,
      },
    });

    return response.body;
  },
});
