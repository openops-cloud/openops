import { Application, createAxiosHeaders } from '@openops/common';
import { resilientPatch } from './utils';

// TODO: remove this when all environments are migrated
export async function renameDatabase(
  databaseId: number,
  databaseName: string,
  token: string,
): Promise<Application> {
  const requestBody = {
    name: databaseName,
  };

  const renameDatabaseEndpoint = `api/applications/${databaseId}/`;
  return resilientPatch(
    renameDatabaseEndpoint,
    requestBody,
    createAxiosHeaders(token),
  ) as Promise<Application>;
}
