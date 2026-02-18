import {
  createAxiosHeadersForAnalytics,
  makeOpenOpsAnalyticsGet,
  makeOpenOpsAnalyticsPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { AxiosHeaders } from 'axios';
import { deleteDataset } from './delete-dataset';

export type DatasetConfig = {
  tableName: string;
  databaseId: number;
  schema: string;
  sql?: string;
  recreateIfExists?: boolean;
};

export type DatasetResult = {
  id: number;
  uuid: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

async function findDatasetByTableName(
  tableName: string,
  authenticationHeader: AxiosHeaders,
  throwOnError = false,
): Promise<DatasetResult | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await makeOpenOpsAnalyticsGet<{ result: any[] }>(
      `dataset?q=(filters:!((col:table_name,opr:eq,value:'${tableName}')))`,
      authenticationHeader,
      !throwOnError,
    );

    if (response?.result?.length > 0) {
      const dataset = response.result[0];
      return {
        id: dataset.id,
        uuid: dataset.uuid,
        ...dataset,
      };
    }
    return undefined;
  } catch (error) {
    if (throwOnError) {
      throw error;
    }
    return undefined;
  }
}

function buildDatasetRequestBody(
  config: DatasetConfig,
): Record<string, unknown> {
  if ('sql' in config) {
    if (!config.sql?.trim()) {
      throw new Error(
        'SQL query cannot be empty or whitespace when creating a virtual dataset',
      );
    }

    return {
      database: config.databaseId,
      schema: config.schema,
      sql: config.sql,
      table_name: config.tableName,
    };
  }

  return {
    database: config.databaseId,
    table_name: config.tableName,
    schema: config.schema,
  };
}

export async function createDataset(
  token: string,
  config: DatasetConfig,
): Promise<DatasetResult> {
  const authenticationHeader = createAxiosHeadersForAnalytics(token);

  const existingDataset = await findDatasetByTableName(
    config.tableName,
    authenticationHeader,
    false,
  );

  if (existingDataset) {
    if (config.recreateIfExists) {
      logger.info(`Dataset ${config.tableName} exists, deleting to recreate`, {
        datasetId: existingDataset.id,
      });
      await deleteDataset(token, existingDataset.id);
    } else {
      return existingDataset;
    }
  }

  const requestBody = buildDatasetRequestBody(config);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await makeOpenOpsAnalyticsPost<any>(
    'dataset',
    requestBody,
    authenticationHeader,
  );

  logger.info(`Created dataset: ${config.tableName}`, {
    tableName: config.tableName,
    datasetId: response.id,
    isVirtual: !!config.sql,
  });

  const result: DatasetResult = {
    id: response.id,
    uuid: response.uuid,
    ...response.result,
  };

  return result;
}
