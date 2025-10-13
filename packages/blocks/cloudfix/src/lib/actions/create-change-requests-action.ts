import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { RiskLevel } from '@openops/shared';
import { cloudfixAuth, CloudfixAuth } from '../common/auth';
import { makeRequest } from '../common/make-request';

export const createChangeRequestsAction = createAction({
  name: 'create_change_requests',
  displayName: 'Create Change Requests',
  description: 'Create change requests from recommendations',
  auth: cloudfixAuth,
  riskLevel: RiskLevel.HIGH,
  isWriteAction: true,
  props: {
    recommendationIds: Property.Array({
      displayName: 'Recommendation IDs',
      description: 'Array of recommendation IDs to create change requests for',
      required: true,
    }),
    executeOnSchedule: Property.Checkbox({
      displayName: 'Execute on schedule',
      description: 'Whether to execute the change requests on schedule',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const { recommendationIds, executeOnSchedule } = context.propsValue;

    const body = {
      recommendationIds,
      executeOnSchedule,
    };

    const response = await makeRequest({
      auth: context.auth as CloudfixAuth,
      endpoint: '/create-change-requests',
      method: HttpMethod.POST,
      body,
    });

    return response;
  },
});
