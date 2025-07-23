import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { getCases } from '../common/cases-api';

export const getCasesAction = createAction({
  name: 'get_cases',
  displayName: 'Get cases',
  description: 'Fetch cases from Ternary.',
  auth: ternaryCloudAuth,
  props: {},
  run: async ({ auth }) => {
    try {
      const result = await getCases(auth);
      return result;
    } catch (e) {
      logger.error('Error getting case management cases.', e);
      throw e;
    }
  },
});
