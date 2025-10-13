import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const getDefaultCommitmentPlansAction = createAction({
  auth: archeraAuth,
  name: 'archera_get_default_commitment_plans',
  description:
    'Retrieve the default Archera commitment plans for a given provider',
  displayName: 'Get Default Commitment Plans',
  IsWriteAction: false,
  props: {
    provider: Property.StaticDropdown({
      displayName: 'Provider',
      description: 'The cloud provider to fetch default commitment plans for.',
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
      url: `https://api.archera.ai/v1/org/${context.auth.orgId}/commitment-plans/default`,
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
