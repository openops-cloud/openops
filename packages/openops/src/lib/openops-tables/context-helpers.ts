import { ServerContext } from '@openops/blocks-framework';
import { AppSystemProp, encryptUtils, system } from '@openops/server-shared';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';

export function shouldUseDatabaseToken(): boolean {
  return system.getBoolean(AppSystemProp.ENABLE_TABLES_DATABASE_TOKEN) ?? false;
}

export type TokenOrContext = string | { getToken: () => string };
export type TablesServerContext = Pick<
  ServerContext,
  'tablesDatabaseId' | 'tablesDatabaseToken'
>;

export function getTablesServerContext(
  serverContext: ServerContext,
): TablesServerContext {
  return {
    tablesDatabaseId: serverContext.tablesDatabaseId,
    tablesDatabaseToken: serverContext.tablesDatabaseToken,
  };
}

export async function resolveTokenProvider(
  serverContext: TablesServerContext,
): Promise<TokenOrContext> {
  if (shouldUseDatabaseToken()) {
    return {
      getToken: () => {
        const { tablesDatabaseToken } = serverContext;
        return encryptUtils.decryptString(tablesDatabaseToken);
      },
    };
  }

  const { token } = await authenticateDefaultUserInOpenOpsTables();
  return token;
}
