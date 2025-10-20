import {
  Application,
  createAxiosHeaders,
  makeOpenOpsTablesGet,
} from '@openops/common';

export async function listDatabases(
  workspaceId: number,
  token: string,
): Promise<Application[]> {
  const applications = await makeOpenOpsTablesGet<Application>(
    `api/applications/workspace/${workspaceId}/`,
    createAxiosHeaders(token),
  );

  return applications.flat().filter((a) => a.type === 'database');
}
