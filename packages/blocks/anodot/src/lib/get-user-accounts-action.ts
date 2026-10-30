import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from './anodot-auth-property';
import { createUmbrellaSession } from './common/auth';
import { listRawUmbrellaAccounts } from './common/umbrella-accounts';

export const getUserAccountsAction = createAction({
  auth: anadotAuth,
  name: 'anodot_get_user_accounts',
  description:
    'Get Umbrella user accounts associated with the authenticated user',
  displayName: 'Get User Accounts',
  isWriteAction: false,
  props: {},
  async run(context) {
    try {
      const session = await createUmbrellaSession(context.auth);

      return await listRawUmbrellaAccounts(session);
    } catch (error) {
      const errorMsg = `An error occurred while fetching Umbrella user accounts: ${error}`;

      logger.warn(errorMsg);
      throw new Error(errorMsg);
    }
  },
});
