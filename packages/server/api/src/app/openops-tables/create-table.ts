import {
  createAxiosHeaders,
  makeOpenOpsTablesPost,
  resolveTokenProvider,
  TablesServerContext,
} from '@openops/common';

export type Table = {
  id: number;
  name: string;
  order: number;
  database_id: number;
};

export async function createTable(
  context: TablesServerContext,
  tableName: string,
  tableColumns: string[][],
): Promise<Table> {
  const requestBody = {
    name: tableName,
    data: tableColumns,
    first_row_header: true,
  };

  const tokenOrResolver = await resolveTokenProvider(context);
  return makeOpenOpsTablesPost<Table>(
    `api/database/tables/database/${context.tablesDatabaseId}/`,
    requestBody,
    createAxiosHeaders(tokenOrResolver),
  );
}
