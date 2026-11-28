import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { RiskLevel } from '@openops/shared';
import { optscaleAuth } from '../auth';
import { pathSegment, sendOptScaleRequest } from '../common/make-request';
import { organizationProperty, poolProperty } from '../common/properties';

export const setPoolBudgetAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_set_pool_budget',
  displayName: 'Set Pool Budget',
  description:
    'Set the monthly budget (limit) of an OptScale pool. A child pool limit cannot exceed its parent limit.',
  isWriteAction: true,
  riskLevel: RiskLevel.MEDIUM,
  props: {
    organizationId: organizationProperty,
    poolId: poolProperty('Pool', 'The pool to set the budget for'),
    limit: Property.Number({
      displayName: 'Monthly Budget',
      description:
        'The monthly limit in the organization currency. Use 0 to remove the limit.',
      required: true,
    }),
  },
  async run(context) {
    const { poolId, limit } = context.propsValue;

    if (limit < 0) {
      throw new Error('Monthly Budget cannot be negative');
    }

    return sendOptScaleRequest({
      auth: context.auth,
      method: HttpMethod.PATCH,
      path: `/pools/${pathSegment(poolId)}`,
      body: { limit },
    });
  },
});
