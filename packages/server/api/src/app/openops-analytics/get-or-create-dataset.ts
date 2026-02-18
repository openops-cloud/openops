import { createDataset, DatasetResult } from './create-dataset';

export async function getOrCreateDataset(
  token: string,
  tableName: string,
  databaseId: number,
  schemaName: string,
): Promise<DatasetResult> {
  return createDataset(token, {
    tableName,
    databaseId,
    schema: schemaName,
    recreateIfExists: false,
  });
}
