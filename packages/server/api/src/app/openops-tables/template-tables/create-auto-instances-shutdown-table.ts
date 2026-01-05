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
import { createTable } from '../create-table';

export const SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME =
  'Auto instances shutdown';

export async function createAutoInstancesShutdownTable(
  context: TablesServerContext,
): Promise<void> {
  logger.debug(
    `[Seeding ${SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME} table] Start`,
  );

  const table = await createTable(
    context,
    SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME,
    [['Resource ID']],
  );

  const tokenOrResolver = await resolveTokenProvider(context);
  const fields = await getFields(table.id, tokenOrResolver);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `[Seeding ${SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME} table] Before adding primary field ID with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'Resource ID',
      type: 'text',
    },
    createAxiosHeaders(tokenOrResolver),
  );
  logger.debug(
    `[Seeding ${SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME} table] After adding primary field ID with id: ${primaryField.id}`,
  );

  await addField(tokenOrResolver, table.id, {
    name: 'Shutdown time',
    type: 'date',
    date_format: 'ISO',
    date_include_time: true,
  });

  const fieldNames = ['Cloud provider', 'Workflow', 'Status'];

  for (const fieldName of fieldNames) {
    await addField(tokenOrResolver, table.id, {
      name: fieldName,
      type: 'text',
    });
  }

  logger.debug(
    `[Seeding ${SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME} table] Done`,
  );
}

async function addField(
  tokenOrResolver: TokenOrResolver,
  tableId: number,
  fieldBody: Record<string, unknown>,
): Promise<{ id: number }> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding ${SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME} Before adding field ${fieldBody.name}`,
  );

  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(tokenOrResolver),
  );

  logger.debug(
    `[Seeding  ${SEED_OPENOPS_AUTO_INSTANCES_SHUTDOWN_TABLE_NAME} table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );

  return field;
}
