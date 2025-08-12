import { createAxiosHeaders, makeOpenOpsTablesPost } from '@openops/common';

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

  return makeOpenOpsTablesPost<Table>(
    `api/database/tables/database/${databaseId}/`,
    requestBody,
    createAxiosHeaders(token),
  );
}
