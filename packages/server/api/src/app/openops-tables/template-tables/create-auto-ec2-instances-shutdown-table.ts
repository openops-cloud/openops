import {
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';

export async function createAutoEc2InstancesShutdownTable(
  databaseId: number,
  token: string,
): Promise<{ tableId: number }> {
  logger.debug('[Seeding Auto EC2 instances shutdown table] Start');

  const table = await openopsTables.createTable(
    databaseId,
    'Auto EC2 instances shutdown',
    [['Arn']],
    token,
  );

  await addFields(token, table.id);

  logger.debug('[Seeding Auto EC2 instances shutdown table] Done');

  return {
    tableId: table.id,
  };
}

export async function addFields(token: string, tableId: number) {
  const fields = await getFields(tableId, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `[Seeding Auto EC2 instances shutdown table] Before adding primary field Arn with id: ${primaryField.id}`,
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
    `[Seeding Auto EC2 instances shutdown table] After adding primary field Arn with id: ${primaryField.id}`,
  );

  await addField(token, tableId, {
    name: 'Shutdown time',
    type: 'date',
    date_format: 'ISO',
    date_include_time: true,
  });
}

async function addField(
  token: string,
  tableId: number,
  fieldBody: Record<string, unknown>,
): Promise<{ id: number }> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding Auto EC2 instances shutdown table] Before adding field ${fieldBody.name}`,
  );

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
  );

  logger.debug(
    `[Seeding Auto EC2 instances shutdown table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
