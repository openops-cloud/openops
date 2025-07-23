import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { getUsersList } from '../common/users';

export const getUsers = createAction({
  name: 'get_users',
  displayName: 'Get Users',
  description: 'Get a list of users.',
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
      return await getUsersList(auth, includeSettings);
    } catch (e) {
      logger.error('Error getting users list.', e);
      throw e;
    }
  },
});
