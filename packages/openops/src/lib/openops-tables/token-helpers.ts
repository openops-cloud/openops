import { ActionContext } from '@openops/blocks-framework';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';
import {
  getTablesDatabaseIdFromContext,
  getTablesDatabaseTokenFromContext,
  shouldUseDatabaseToken,
} from './context-helpers';

const DEFAULT_DATABASE_ID = 1;

export async function getTokenForBlock(
  context: ActionContext,
): Promise<{ token: string; useDatabaseToken: boolean }> {
  if (!shouldUseDatabaseToken()) {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    return { token, useDatabaseToken: false };
  }

  return {
    token: getTablesDatabaseTokenFromContext(context),
    useDatabaseToken: true,
  };
}

export function getDatabaseIdForBlock(context: ActionContext): number {
  if (!shouldUseDatabaseToken()) {
    return DEFAULT_DATABASE_ID;
  }

  return getTablesDatabaseIdFromContext(context);
}
