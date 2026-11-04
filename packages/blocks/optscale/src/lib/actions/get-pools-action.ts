import { HttpMethod } from '@openops/blocks-common';
import { createAction } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { sendOptScaleRequest } from '../common/make-request';
import { organizationProperty } from '../common/properties';

export const getPoolsAction = createAction({
  auth: optscaleAuth,
  name: 'optscale_get_pools',
  displayName: 'Get Pools',
  description:
    'Get the pool hierarchy of an OptScale organization, with budgets (limits), current cost and forecast',
  isWriteAction: false,
  props: {
    organizationId: organizationProperty,
  },
  async run(context) {
    const auth = context.auth;
    const organization = await sendOptScaleRequest<{ pool_id: string }>({
      auth,
      method: HttpMethod.GET,
      path: `/organizations/${context.propsValue.organizationId}`,
    });

    return sendOptScaleRequest({
      auth,
      method: HttpMethod.GET,
      path: `/pools/${organization.pool_id}`,
      query: { children: true, details: true },
    });
  },
});
