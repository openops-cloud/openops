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
    console.warn(
      'Using default authentication for project database token',
      token,
    );
    return token;
  }

  const encryptedToken = await getEncryptedToken(projectId);
  const decryptedToken = encryptUtils.decryptString(encryptedToken);
  console.warn('Decrypted token for project database token', decryptedToken);
  return decryptedToken;
}
