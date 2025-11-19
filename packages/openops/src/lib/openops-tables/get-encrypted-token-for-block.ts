import { AxiosHeaders } from 'axios';
import { makeHttpRequest } from '../axios-wrapper';
import type { GetEncryptedTokenFn } from './get-project-database-token';
import { getProjectDatabaseToken } from './get-project-database-token';

export function createGetEncryptedTokenForBlock(
  apiUrl: string,
  authToken: string,
): GetEncryptedTokenFn {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (_projectId: string) => {
    const headers = new AxiosHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    });

    const normalizedApiUrl = apiUrl.endsWith('/')
      ? apiUrl.slice(0, -1)
      : apiUrl;
    const response = await makeHttpRequest<{
      tablesDatabaseToken: { iv: string; data: string };
    }>('GET', `${normalizedApiUrl}/v1/worker/project`, headers);

    return response.tablesDatabaseToken;
  };
}

export async function getProjectDatabaseTokenForBlock(
  apiUrl: string,
  authToken: string,
  projectId: string,
): Promise<string> {
  const getEncryptedToken = createGetEncryptedTokenForBlock(apiUrl, authToken);
  return getProjectDatabaseToken(projectId, getEncryptedToken);
}
