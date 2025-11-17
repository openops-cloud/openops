import { DatabaseToken } from './create-database-token';
import { openopsTables } from './index';

const TOKEN_NAME_PREFIX = 'Project_';

export async function generateDatabaseToken(
  systemToken: string,
  projectId: string,
  workspaceId: number,
): Promise<DatabaseToken> {
  return openopsTables.createDatabaseToken({
    name: `${TOKEN_NAME_PREFIX}${projectId}`,
    workspaceId,
    systemToken,
  });
}
