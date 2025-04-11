import {
  axiosTablesSeedRetryConfig,
  createAxiosHeaders,
  makeOpenOpsTablesGet,
} from './requests-helpers';
import { Application } from './types';

export const OPENOPS_DEFAULT_DATABASE_NAME = 'OpenOps Dataset';

export async function getDefaultDatabaseId(
  token: string,
  databaseName = OPENOPS_DEFAULT_DATABASE_NAME, // TODO: remove this when all environments are migrated
): Promise<number> {
  const authenticationHeader = createAxiosHeaders(token);

  const getTablesResult: Application[] =
    await makeOpenOpsTablesGet<Application>(
      `api/applications/`,
      authenticationHeader,
      axiosTablesSeedRetryConfig,
    );

  const defaultDatabase: Application | undefined = getTablesResult
    .flatMap((item) => item)
    .find((t) => t.type === 'database' && t.name === databaseName);

  if (!defaultDatabase) {
    throw new Error('Default database not found');
  }

  return defaultDatabase.id;
}
