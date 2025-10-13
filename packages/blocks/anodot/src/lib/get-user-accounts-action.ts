import { createAction } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { anadotAuth } from './anodot-auth-property';
import { authenticateUserWithAnodot } from './common/auth';
import { getAnodotUsers } from './common/users';

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
      const { authUrl, apiUrl, username, password } = context.auth;

      const anodotTokens = await authenticateUserWithAnodot(
        authUrl,
        username,
        password,
      );
      const anodotUsers = await getAnodotUsers(apiUrl, anodotTokens);

      return anodotUsers.accounts;
    } catch (error) {
      const errorMsg = `An error occurred while fetching Umbrella user accounts: ${error}`;

      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  },
});
