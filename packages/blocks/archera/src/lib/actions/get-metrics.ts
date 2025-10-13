import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const getMetricsAction = createAction({
  auth: archeraAuth,
  name: 'archera_get_metrics',
  description: 'Get savings and utilization metrics for a provider',
  displayName: 'Get Metrics',
  IsWriteAction: false,
  props: {
    provider: Property.StaticDropdown({
      displayName: 'Provider',
      description: 'The cloud provider to fetch metrics for.',
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
      url: `https://api.archera.ai/v1/org/${context.auth.orgId}/metrics`,
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
