import { ServerContext } from '@openops/blocks-framework';
import { encryptUtils } from '@openops/server-shared';

export type TokenOrResolver = string | { getToken: () => string };
export type TablesServerContext = Pick<
  ServerContext,
  'tablesDatabaseId' | 'tablesDatabaseToken'
>;

export async function createTokenProvider(
  serverContext: TablesServerContext,
): Promise<TokenOrResolver> {
  return {
    getToken: () => {
      const { tablesDatabaseToken } = serverContext;
      return encryptUtils.decryptString(tablesDatabaseToken);
    },
  };
}
