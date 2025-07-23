import { HttpMethod } from '@openops/blocks-common';
import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { sendTernaryRequest } from '../common';
import { ternaryCloudAuth } from '../common/auth';

export const getUsers = createAction({
  name: 'get_users',
  displayName: 'Get Users',
  description: 'Get list of Users.',
  auth: ternaryCloudAuth,
  props: {
    includeSettings: Property.Checkbox({
      displayName: 'Include Settings',
      description: 'Include the tenant settings',
      required: false,
    }),
  },
  run: async ({ auth, propsValue }) => {
    const { includeSettings } = propsValue;

    try {
      const response = await sendTernaryRequest({
        auth: auth,
        method: HttpMethod.GET,
        url: 'users',
        queryParams: {
          tenantID: auth.tenantId,
          includeSettings: `${includeSettings ?? false}`,
        },
      });
      return response.body as any[];
    } catch (e) {
      logger.error('Error getting users list.', e);
      throw e;
    }
  },
});
