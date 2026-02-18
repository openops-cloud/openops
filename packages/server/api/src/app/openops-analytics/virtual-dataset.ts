import { createDataset, DatasetConfig, DatasetResult } from './create-dataset';

export type VirtualDatasetConfig = Omit<DatasetConfig, 'sql'> & {
  sql: string;
};

export async function createVirtualDataset(
  token: string,
  config: VirtualDatasetConfig,
): Promise<DatasetResult> {
  return createDataset(token, config);
}
