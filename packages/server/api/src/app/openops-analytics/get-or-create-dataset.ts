import { createDataset } from './create-dataset';

export async function getOrCreateDataset(
  token: string,
  tableName: string,
  databaseId: number,
  schemaName: string,
): Promise<{ id: number; uuid: string }> {
  return createDataset(token, {
    tableName,
    databaseId,
    schema: schemaName,
    recreateIfExists: false,
  });
}
