/* eslint-disable @typescript-eslint/no-explicit-any */
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

export const SEED_OPENOPS_TABLE_NAME = 'Timeseries';

export async function createTimeseriesTable(
  tablesContext: TablesServerContext,
): Promise<void> {
  logger.debug(`[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Start`);

  const table = await createTable(tablesContext, SEED_OPENOPS_TABLE_NAME, [
    ['ID'],
  ]);

  const tokenOrResolver = await resolveTokenProvider(tablesContext);
  const fields = await getFields(table.id, tokenOrResolver);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Before adding primary field ID with id: ${primaryField.id}`,
  );
  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'ID',
      type: 'uuid',
    },
    createAxiosHeaders(tokenOrResolver),
  );
  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] After adding primary field ID with id: ${primaryField.id}`,
  );

  await addField(tokenOrResolver, table.id, {
    name: 'Date',
    type: 'date',
    date_format: 'ISO',
    date_include_time: false,
  });

  await addField(tokenOrResolver, table.id, {
    name: 'Value',
    type: 'number',
    number_decimal_places: 2,
  });

  const fieldNames = ['Workflow', 'Type', 'Description', 'Service', 'Account'];

  for (const fieldName of fieldNames) {
    await addField(tokenOrResolver, table.id, {
      name: fieldName,
      type: 'text',
    });
  }

  logger.debug(`[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Done`);
}

async function addField(
  tokenOrResolver: TokenOrResolver,
  tableId: number,
  fieldBody: any,
): Promise<void> {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Before adding field ${fieldBody.name}`,
  );
  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(tokenOrResolver),
  );

  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );
}
