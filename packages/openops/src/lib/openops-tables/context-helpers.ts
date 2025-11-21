import { ActionContext, PropertyContext } from '@openops/blocks-framework';
import { AppSystemProp, encryptUtils, system } from '@openops/server-shared';

export function shouldUseDatabaseToken(): boolean {
  return system.getBoolean(AppSystemProp.USE_DATABASE_TOKEN) ?? false;
}

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
