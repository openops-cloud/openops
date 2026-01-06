import {
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
  resolveTokenProvider,
  TablesServerContext,
  TokenOrResolver,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';

export async function createTagOwnerMappingTable(
  tablesContext: TablesServerContext,
  buTableId: number,
): Promise<{ tableId: number }> {
  logger.debug('[Seeding Tag-Owner mapping table] Start');

  const table = await openopsTables.createTable(
    tablesContext,
    'Tag-Owner mapping',
    [['Owner tag value']],
  );

  const tokenOrResolver = await resolveTokenProvider(tablesContext);
  await addFields(tokenOrResolver, table.id, buTableId);

  logger.debug('[Seeding Tag-Owner mapping table] Done');

  return {
    tableId: table.id,
  };
}

export async function addFields(
  tokenOrResolver: TokenOrResolver,
  tableId: number,
  buTableId: number,
): Promise<void> {
  const fields = await getFields(tableId, tokenOrResolver);
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
    createAxiosHeaders(tokenOrResolver),
  );
  logger.debug(
    `[Seeding Tag-Owner mapping table] After adding primary field Owner tag value with id: ${primaryField.id}`,
  );

  await addField(tokenOrResolver, tableId, {
    name: 'Owner email',
    type: 'email',
  });

  await addField(tokenOrResolver, tableId, {
    name: 'BU',
    type: 'link_row',
    link_row_table_id: buTableId,
  });
}

async function addField(
  tokenOrResolver: TokenOrResolver,
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
    createAxiosHeaders(tokenOrResolver),
  );

  logger.debug(
    `[Seeding Tag-Owner mapping table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
