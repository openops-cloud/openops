import { httpClient, HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { archeraAuth } from '../../auth';

export const applyCommitmentPlanAction = createAction({
  auth: archeraAuth,
  name: 'archera_apply_commitment_plan',
  description: 'Apply a commitment plan',
  displayName: 'Apply Commitment Plan',
  isWriteAction: true,
  props: {
    planId: Property.ShortText({
      displayName: 'Plan ID',
      description: 'The UUID of the commitment plan to apply',
      required: true,
    }),
  },
  async run(context) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: `https://api.archera.ai/v1/org/${context.auth.orgId}/commitment-plans/${context.propsValue.planId}/apply`,
      headers: {
        'x-api-key': context.auth.apiToken,
      },
    });

    return response.body;
  },
});
