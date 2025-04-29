/* eslint-disable @typescript-eslint/no-explicit-any */
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

export const SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME =
  'Known cost types by application';

export async function createKnownCostTypesByApplicationTable(
  token: string,
  databaseId: number,
) {
  logger.debug(
    `[Seeding ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} table] Start`,
  );

  const table = await createTable(
    databaseId,
    SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME,
    [['ID']],
    token,
  );

  const fields = await getFields(table.id, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `[Seeding ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} table] Before adding primary field ID with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'ID',
      type: 'uuid',
    },
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );
  logger.debug(
    `[Seeding ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} table] After adding primary field ID with id: ${primaryField.id}`,
  );

  await addField(token, table.id, {
    name: 'Verified',
    type: 'boolean',
  });

  await addField(token, table.id, {
    name: 'Total Cost',
    type: 'number',
    number_decimal_places: 10,
  });

  await addField(token, table.id, {
    name: 'Total Consumed Quantity',
    type: 'number',
    number_decimal_places: 0,
  });

  const fieldNames = ['Application', 'SKU id', 'Service Category'];

  for (const fieldName of fieldNames) {
    await addField(token, table.id, { name: fieldName, type: 'text' });
  }

  logger.debug(
    `[Seeding ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} table] Done`,
  );
}

async function addField(token: string, tableId: number, fieldBody: any) {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} table] Before adding field ${fieldBody.name}`,
  );
  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );

  logger.debug(
    `[Seeding ${SEED_OPENOPS_KNOWN_COST_TYPES_BY_APPLICATION_TABLE_NAME} table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );
}
