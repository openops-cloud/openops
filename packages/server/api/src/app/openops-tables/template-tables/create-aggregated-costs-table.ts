import {
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';

export const SEED_TABLE_NAME = 'Aggregated Costs';
const SEED_LOG_HEADER = `[Seeding ${SEED_TABLE_NAME} table]`;

export async function createAggregatedCostsTable(
  databaseId: number,
  token: string,
): Promise<{ tableId: number }> {
  logger.debug(`${SEED_LOG_HEADER} Start`);

  const table = await openopsTables.createTable(
    databaseId,
    SEED_TABLE_NAME,
    [['Group Key']],
    token,
  );

  await addFields(token, table.id);

  logger.debug(`${SEED_LOG_HEADER} Done`);

  return {
    tableId: table.id,
  };
}

export async function addFields(token: string, tableId: number) {
  const fields = await getFields(tableId, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `${SEED_LOG_HEADER} Before adding primary field ${primaryField.name} with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'Group Key',
      type: 'text',
    },
    createAxiosHeaders(token),
  );
  logger.debug(
    `${SEED_LOG_HEADER} After adding primary field ${primaryField.name} with id: ${primaryField.id}`,
  );

  const fieldsToAdd = [
    { name: 'Date', type: 'date', date_format: 'ISO' },
    { name: 'Application', type: 'text' },
    { name: 'Total Billed Cost', type: 'number', number_decimal_places: 10 },
    { name: 'Total Effective Cost', type: 'number', number_decimal_places: 10 },
    {
      name: 'Total Consumed Quantity',
      type: 'number',
      number_decimal_places: 1,
    },
  ];

  for (const field of fieldsToAdd) {
    await addField(token, tableId, field);
  }
}

async function addField(
  token: string,
  tableId: number,
  fieldBody: Record<string, unknown>,
): Promise<{ id: number }> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(`${SEED_LOG_HEADER} Before adding field ${fieldBody.name}`);

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
  );

  logger.debug(
    `${SEED_LOG_HEADER} After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
