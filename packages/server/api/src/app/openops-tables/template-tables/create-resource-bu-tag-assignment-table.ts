import {
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { openopsTables } from '../index';

export async function createResourceBuTagAssignmentTable(
  databaseId: number,
  token: string,
  buTableId: number,
): Promise<{ tableId: number }> {
  logger.debug('[Seeding Resource BU tag assignment table] Start');

  const table = await openopsTables.createTable(
    databaseId,
    'Resource BU tag assignment',
    [['Resource identifier']],
    token,
  );

  await addFields(token, table.id, buTableId);

  logger.debug('[Seeding Resource BU tag assignment table] Done');
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
    `[Seeding Resource BU tag assignment table] Before adding primary field Arn with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'Resource identifier',
      type: 'text',
    },
    createAxiosHeaders(token),
  );
  logger.debug(
    `[Seeding Resource BU tag assignment table] After adding primary field Resource identifier with id: ${primaryField.id}`,
  );

  await addField(token, tableId, { name: 'Resource type', type: 'text' });

  const selectOwnerBuField = await addField(token, tableId, {
    name: 'Select owner BU',
    type: 'link_row',
    link_row_table_id: buTableId,
    has_related_field: false,
  });

  const buFields = await getFields(buTableId, token);
  const buTargetField = buFields.find((field) => field.name === 'BU code');
  if (!buTargetField) {
    throw new Error(
      '[Seeding Resource BU tag assignment table] BU target field not found in business units table',
    );
  }

  await addField(token, tableId, {
    name: 'BU code',
    type: 'lookup',
    through_field_id: selectOwnerBuField.id,
    target_field_id: buTargetField.id,
  });
}

async function addField(
  token: string,
  tableId: number,
  fieldBody: Record<string, unknown>,
): Promise<{ id: number }> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding Resource BU tag assignment table] Before adding field ${fieldBody.name}`,
  );

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
  );

  logger.debug(
    `[Seeding Resource BU tag assignment table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
