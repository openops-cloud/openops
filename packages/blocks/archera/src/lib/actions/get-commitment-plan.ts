import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const getCommitmentPlanAction = createAction({
  auth: archeraAuth,
  name: 'archera_get_commitment_plan',
  description: 'Get a specific commitment plan by ID',
  displayName: 'Get Commitment Plan',
  isWriteAction: false,
  props: {
    planId: Property.ShortText({
      displayName: 'Plan ID',
      description: 'The UUID of the commitment plan to retrieve.',
      required: true,
    }),
  },
  async run(context) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.archera.ai/v1/org/${context.auth.orgId}/commitment-plans/${context.propsValue.planId}`,
      headers: {
        'x-api-key': context.auth.apiToken,
      },
    });

    return response.body;
  },
});
