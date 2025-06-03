import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const getRecommendationsAction = createAction({
  auth: archeraAuth,
  name: 'archera_get_recommendations',
  description: 'Get Recommendations from Archera',
  displayName: 'Get Recommendations',
  props: {
    provider: Property.StaticDropdown({
      displayName: 'Provider',
      description:
        'The recommendations provider to fetch recommendations from.',
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
      url: `https://api.archera.dev/v2/org/${context.auth.orgId}/partners/purchase-plans-v2/recommended?provider=${context.propsValue.provider}`,
      headers: {
        Authorization: `Basic ${context.auth.apiToken}`,
      },
    });

    return response.body;
  },
});
