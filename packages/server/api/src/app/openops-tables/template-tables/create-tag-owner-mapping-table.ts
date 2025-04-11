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

export async function createTagOwnerMappingTable(
  databaseId: number,
  token: string,
  buTableId: number,
): Promise<{ tableId: number }> {
  logger.debug('[Seeding Tag-Owner mapping table] Start');

  const table = await openopsTables.createTable(
    databaseId,
    'Tag-Owner mapping',
    [['Owner tag value']],
    token,
  );

  await addFields(token, table.id, buTableId);

  logger.debug('[Seeding Tag-Owner mapping table] Done');

  return {
    tableId: table.id,
  };
}

export async function addFields(
  token: string,
  tableId: number,
  buTableId: number,
) {
  const fields = await getFields(tableId, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `[Seeding Tag-Owner mapping table] Before adding primary field Owner tag value with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'Owner tag value',
      type: 'text',
    },
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );
  logger.debug(
    `[Seeding Tag-Owner mapping table] After adding primary field Owner tag value with id: ${primaryField.id}`,
  );

  await addField(token, tableId, { name: 'Owner email', type: 'email' });

  await addField(token, tableId, {
    name: 'BU',
    type: 'link_row',
    link_row_table_id: buTableId,
  });
}

async function addField(
  token: string,
  tableId: number,
  fieldBody: Record<string, unknown>,
): Promise<{ id: number }> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding Tag-Owner mapping table] Before adding field ${fieldBody.name}`,
  );

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );

  logger.debug(
    `[Seeding Tag-Owner mapping table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
