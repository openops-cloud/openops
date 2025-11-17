import { authenticateDefaultUserInOpenOpsTables } from '@openops/common';
import { DatabaseToken } from './create-database-token';
import { openopsTables } from './index';

const TOKEN_NAME_PREFIX = 'Project_';

export const databaseTokenService = {
  async generateDatabaseToken(
    projectId: string,
    workspaceId: number,
  ): Promise<DatabaseToken> {
    const { token: systemToken } =
      await authenticateDefaultUserInOpenOpsTables();

    const tokenName = `${TOKEN_NAME_PREFIX}${projectId}`;

    return openopsTables.createDatabaseToken({
      name: tokenName,
      workspaceId,
      systemToken,
    });
  },
};
