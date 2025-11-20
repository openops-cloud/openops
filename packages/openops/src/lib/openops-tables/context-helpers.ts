import { ActionContext } from '@openops/blocks-framework';
import { getProjectDatabaseTokenForBlock } from './get-encrypted-token-for-block';

export async function getTokenFromContext(
  context: ActionContext,
): Promise<string> {
  return getProjectDatabaseTokenForBlock(
    context.server.apiUrl,
    context.server.token,
    context.project.id,
  );
}

export function createTableCacheKey(runId: string, tableName: string): string {
  return `${runId}-table-${tableName}`;
}

export function createFieldsCacheKey(runId: string, tableId: number): string {
  return `${runId}-${tableId}-fields`;
}
