import { TablesServerContext } from '@openops/common';
import { getDefaultProjectTablesDatabaseToken } from '../get-default-user-db-token';

export const getAdminTablesContext = async (): Promise<TablesServerContext> => {
  const { tablesDatabaseId, tablesDatabaseToken } =
    await getDefaultProjectTablesDatabaseToken();

  return { /*bearerToken,*/ tablesDatabaseId, tablesDatabaseToken };
};
