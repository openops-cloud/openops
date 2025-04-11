import { createAxiosHeaders } from '@openops/common';
import { resilientPost } from './utils';

export type Table = {
  id: number;
  name: string;
  order: number;
  database_id: number;
};

export async function createTable(
  databaseId: number,
  tableName: string,
  tableColumns: string[][],
  token: string,
): Promise<Table> {
  const requestBody = {
    name: tableName,
    data: tableColumns,
    first_row_header: true,
  };

  const createTableEndpoint = `api/database/tables/database/${databaseId}/`;
  return resilientPost(
    createTableEndpoint,
    requestBody,
    createAxiosHeaders(token),
  ) as Promise<Table>;
}
