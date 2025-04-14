import {
  axiosTablesSeedRetryConfig,
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';

export async function createBusinessUnitsTable(
  databaseId: number,
  token: string,
): Promise<{ tableId: number }> {
  logger.debug('[Seeding Business units table] Start');

  const table = await openopsTables.createTable(
    databaseId,
    'Business units',
    [['BU name']],
    token,
  );

  await addFields(token, table.id);

  logger.debug('[Seeding Business units table] Done');

  return {
    tableId: table.id,
  };
}

export async function addFields(token: string, tableId: number) {
  const fields = await getFields(tableId, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `[Seeding Business units table] Before adding primary field BU name with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'BU name',
      type: 'text',
    },
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );
  logger.debug(
    `[Seeding Business units table] After adding primary field BU name with id: ${primaryField.id}`,
  );

  await addField(token, tableId, { name: 'BU code', type: 'text' });
  await addField(token, tableId, { name: 'Notes', type: 'long_text' });
}

async function addField(
  token: string,
  tableId: number,
  fieldBody: Record<string, unknown>,
): Promise<{ id: number }> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding Business units table] Before adding field ${fieldBody.name}`,
  );

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );

  logger.debug(
    `[Seeding Business units table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
