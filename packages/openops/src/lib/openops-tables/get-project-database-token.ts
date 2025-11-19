import { AppSystemProp, encryptUtils, system } from '@openops/server-shared';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';

export type EncryptedDatabaseToken = {
  iv: string;
  data: string;
};

export type GetEncryptedTokenFn = (
  projectId: string,
) => Promise<EncryptedDatabaseToken>;

export async function getProjectDatabaseToken(
  projectId: string,
  getEncryptedToken: GetEncryptedTokenFn,
): Promise<string> {
  const useDatabaseToken =
    system.getBoolean(AppSystemProp.USE_DATABASE_TOKEN) ?? false;

  if (!useDatabaseToken) {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    return token;
  }

  const encryptedToken = await getEncryptedToken(projectId);
  return encryptUtils.decryptString(encryptedToken);
}
