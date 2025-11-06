import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { ternaryCloudAuth } from '../common/auth';
import { getCases } from '../common/cases-api';

export const getCasesAction = createAction({
  name: 'get_cases',
  displayName: 'Get Cases',
  description: 'Get Cases',
  auth: ternaryCloudAuth,
  isWriteAction: false,
  props: {},
  run: async ({ auth }) => {
    try {
      const result = await getCases(auth);
      return result;
    } catch (e) {
      logger.warn('Error getting case management cases.', e);
      throw e;
    }
  },
});
