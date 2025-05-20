import {
  axiosTablesSeedRetryConfig,
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { createTable } from '../create-table';

export const SEED_ONE_TIME_NOTIFICATIONS_TABLE_NAME = 'One-time notifications';
const SEED_LOG_HEADER = `[Seeding ${SEED_ONE_TIME_NOTIFICATIONS_TABLE_NAME} table]`;

export async function createOneTimeNotificationsTable(
  token: string,
  databaseId: number,
): Promise<void> {
  logger.debug(`${SEED_LOG_HEADER} Start`);

  const table = await createTable(
    databaseId,
    SEED_ONE_TIME_NOTIFICATIONS_TABLE_NAME,
    [['Key']],
    token,
  );

  const fields = await getFields(table.id, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `${SEED_LOG_HEADER} Before adding primary field ${primaryField.name} with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'Key',
      type: 'text',
    },
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );

  logger.debug(
    `${SEED_LOG_HEADER} After adding primary field ${primaryField.name} with id: ${primaryField.id}`,
  );

  await addField(token, table.id, {
    name: 'Last modified',
    type: 'date',
    date_format: 'ISO',
    date_include_time: true,
  });

  await addField(token, table.id, {
    name: 'Workflow',
    type: 'text',
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function addField(
  token: string,
  tableId: number,
  fieldBody: any,
): Promise<void> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(`${SEED_LOG_HEADER} Before adding field ${fieldBody.name}`);

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );

  logger.debug(
    `${SEED_LOG_HEADER} After adding field ${fieldBody.name} with id: ${field.id}`,
  );
}
