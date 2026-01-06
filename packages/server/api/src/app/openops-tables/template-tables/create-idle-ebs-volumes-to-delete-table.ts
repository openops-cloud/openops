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

export async function createIdleEbsVolumesToDeleteTable(
  tablesContext: TablesServerContext,
): Promise<{ tableId: number }> {
  logger.debug(`[Seeding Idle EBS Volumes to delete table] Start`);

  const table = await openopsTables.createTable(
    tablesContext,
    'Idle EBS Volumes to delete',
    [['Arn']],
  );

  const tokenOrResolver = await resolveTokenProvider(tablesContext);
  await addFields(tokenOrResolver, table.id);

  logger.debug(`[Seeding Idle EBS Volumes to delete table] Done`);

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
    `[Seeding Idle EBS Volumes to delete table] Before adding primary field Arn with id: ${primaryField.id}`,
  );

  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'Arn',
      type: 'text',
    },
    createAxiosHeaders(tokenOrResolver),
  );
  logger.debug(
    `[Seeding Idle EBS Volumes to delete table] After adding primary field Arn with id: ${primaryField.id}`,
  );

  await addField(tokenOrResolver, tableId, {
    name: 'Status',
    type: 'single_select',
    select_options: [
      { value: 'New Opportunity', color: 'dark-yellow' },
      { value: 'Delete', color: 'red' },
      { value: 'Deleted', color: 'green' },
      { value: 'Keep', color: 'dark-green' },
    ],
  });

  await addField(tokenOrResolver, tableId, { name: 'Region', type: 'text' });
  await addField(tokenOrResolver, tableId, { name: 'Account', type: 'text' });
  await addField(tokenOrResolver, tableId, {
    name: 'Cost USD per month',
    type: 'number',
    number_decimal_places: 2,
  });
  await addField(tokenOrResolver, tableId, { name: 'Name', type: 'text' });
  await addField(tokenOrResolver, tableId, { name: 'Owner', type: 'email' });
  await addField(tokenOrResolver, tableId, {
    name: 'Is attached?',
    type: 'boolean',
  });
  await addField(tokenOrResolver, tableId, {
    name: 'Volume details',
    type: 'long_text',
  });
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
    `[Seeding Idle EBS Volumes to delete table] Before adding field ${fieldBody.name}`,
  );

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(tokenOrResolver),
  );

  logger.debug(
    `[Seeding Idle EBS Volumes to delete table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
