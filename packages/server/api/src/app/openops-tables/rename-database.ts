import {
  Application,
  axiosTablesSeedRetryConfig,
  createAxiosHeaders,
  makeOpenOpsTablesPatch,
} from '@openops/common';

// TODO: remove this when all environments are migrated
export async function renameDatabase(
  databaseId: number,
  databaseName: string,
  token: string,
): Promise<Application> {
  const requestBody = {
    name: databaseName,
  };

  return makeOpenOpsTablesPatch<Application>(
    `api/applications/${databaseId}/`,
    requestBody,
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );
}
