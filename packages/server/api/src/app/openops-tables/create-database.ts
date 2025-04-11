import { Application, createAxiosHeaders } from '@openops/common';
import { resilientPost } from './utils';

export async function createDatabase(
  workspaceId: number,
  databaseName: string,
  token: string,
): Promise<Application> {
  const requestBody = {
    name: databaseName,
    type: 'database',
    init_with_data: false,
  };

  const createDatabaseEndpoint = `api/applications/workspace/${workspaceId}/`;
  return resilientPost(
    createDatabaseEndpoint,
    requestBody,
    createAxiosHeaders(token),
  ) as Promise<Application>;
}
