import {
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';

export async function createIdleEbsVolumesToDeleteTable(
  databaseId: number,
  token: string,
): Promise<{ tableId: number }> {
  logger.debug(`[Seeding Idle EBS Volumes to delete table] Start`);

  const table = await openopsTables.createTable(
    databaseId,
    'Idle EBS Volumes to delete',
    [['Arn']],
    token,
  );

  await addFields(token, table.id);

  logger.debug(`[Seeding Idle EBS Volumes to delete table] Done`);

  return {
    tableId: table.id,
  };
}

export async function addFields(token: string, tableId: number) {
  const fields = await getFields(tableId, token);
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
    createAxiosHeaders(token),
  );
  logger.debug(
    `[Seeding Idle EBS Volumes to delete table] After adding primary field Arn with id: ${primaryField.id}`,
  );

  await addField(token, tableId, {
    name: 'Status',
    type: 'single_select',
    select_options: [
      { value: 'New Opportunity', color: 'dark-yellow' },
      { value: 'Delete', color: 'red' },
      { value: 'Deleted', color: 'green' },
      { value: 'Keep', color: 'dark-green' },
    ],
  });

  await addField(token, tableId, { name: 'Region', type: 'text' });
  await addField(token, tableId, { name: 'Account', type: 'text' });
  await addField(token, tableId, {
    name: 'Cost USD per month',
    type: 'number',
    number_decimal_places: 2,
  });
  await addField(token, tableId, { name: 'Name', type: 'text' });
  await addField(token, tableId, { name: 'Owner', type: 'email' });
  await addField(token, tableId, { name: 'Is attached?', type: 'boolean' });
  await addField(token, tableId, { name: 'Volume details', type: 'long_text' });
  await addField(token, tableId, { name: 'Notes', type: 'long_text' });
}

async function addField(
  token: string,
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
    createAxiosHeaders(token),
  );

  logger.debug(
    `[Seeding Idle EBS Volumes to delete table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
