import { createDataset } from './create-dataset';

export type VirtualDatasetConfig = {
  table_name: string;
  sql: string;
  database: number;
  schema: string;
};

export async function createVirtualDataset(
  token: string,
  config: VirtualDatasetConfig,
): Promise<{ id: number; uuid: string }> {
  const result = await createDataset(token, {
    tableName: config.table_name,
    databaseId: config.database,
    schema: config.schema,
    sql: config.sql,
    recreateIfExists: true,
  });

  return { id: result.id, uuid: result.uuid };
}
