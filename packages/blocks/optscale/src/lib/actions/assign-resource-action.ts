import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { RiskLevel } from '@openops/shared';
import { optscaleAuth } from '../auth';
import { sendOptScaleRequest } from '../common/make-request';
import {
  employeeProperty,
  organizationProperty,
  poolProperty,
} from '../common/properties';

export const assignResourceAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_assign_resource',
  displayName: 'Assign Resource Owner',
  description: 'Assign one or more OptScale resources to an owner and pool',
  isWriteAction: true,
  riskLevel: RiskLevel.LOW,
  props: {
    organizationId: organizationProperty,
    resourceIds: Property.Array({
      displayName: 'Resource IDs',
      description:
        'The OptScale resource IDs (the "resource_id" field in recommendations and expenses)',
      required: true,
    }),
    poolId: poolProperty('Pool', 'The pool to assign the resources to'),
    ownerId: employeeProperty(
      'Owner',
      'The employee who will own the resources',
    ),
  },
  async run(context) {
    const { organizationId, resourceIds, poolId, ownerId } = context.propsValue;

    const ids = resourceIds
      .map((id) => String(id).trim())
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      throw new Error('At least one resource ID is required');
    }

    return sendOptScaleRequest({
      auth: context.auth,
      method: HttpMethod.POST,
      path: `/organizations/${organizationId}/assignments/bulk`,
      body: { resource_ids: ids, pool_id: poolId, owner_id: ownerId },
    });
  },
});
