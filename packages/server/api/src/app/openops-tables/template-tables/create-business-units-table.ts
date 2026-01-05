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

export async function createBusinessUnitsTable(
  context: TablesServerContext,
): Promise<{ tableId: number }> {
  logger.debug('[Seeding Business units table] Start');

  const table = await openopsTables.createTable(context, 'Business units', [
    ['BU name'],
  ]);

  const tokenOrResolver = await resolveTokenProvider(context);
  await addFields(tokenOrResolver, table.id);

  logger.debug('[Seeding Business units table] Done');

  return {
    tableId: table.id,
  };
}

export async function addFields(
  tokenOrResolver: TokenOrResolver,
  tableId: number,
): Promise<void> {
  const fields = await getFields(tableId, tokenOrResolver);
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
    createAxiosHeaders(tokenOrResolver),
  );
  logger.debug(
    `[Seeding Business units table] After adding primary field BU name with id: ${primaryField.id}`,
  );

  await addField(tokenOrResolver, tableId, { name: 'BU code', type: 'text' });
  await addField(tokenOrResolver, tableId, {
    name: 'Notes',
    type: 'long_text',
  });
}

async function addField(
  tokenOrResolver: TokenOrResolver,
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
    createAxiosHeaders(tokenOrResolver),
  );

  logger.debug(
    `[Seeding Business units table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
