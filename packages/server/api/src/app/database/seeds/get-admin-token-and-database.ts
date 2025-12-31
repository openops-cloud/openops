import { authenticateAdminUserInOpenOpsTables } from '../../openops-tables/auth-admin-tables';
import { getDefaultProjectTablesDatabaseToken } from '../get-default-user-db-token';
import { EncryptedObject } from '@openops/shared';

export const getAdminTablesContext = async (): Promise<{
  bearerToken: string;
  tablesDatabaseId: number;
  tablesDatabaseToken: EncryptedObject;
}> => {
  const { token: bearerToken } = await authenticateAdminUserInOpenOpsTables();

  const { tablesDatabaseId, tablesDatabaseToken } =
    await getDefaultProjectTablesDatabaseToken();

  return { bearerToken, tablesDatabaseId, tablesDatabaseToken };
};
