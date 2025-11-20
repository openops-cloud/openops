import { ActionContext, PropertyContext } from '@openops/blocks-framework';
import { encryptUtils } from '@openops/server-shared';

export function getTablesDatabaseTokenFromContext(
  context: ActionContext | PropertyContext,
): string {
  const { tablesDatabaseToken } = context.server;
  return encryptUtils.decryptString(tablesDatabaseToken);
}

export function getTablesDatabaseIdFromContext(
  context: ActionContext | PropertyContext,
): number {
  return context.server.tablesDatabaseId;
}
