/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  axiosTablesSeedRetryConfig,
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { logger } from '@openops/server-shared';
import { createTable } from '../create-table';

export const SEED_OPENOPS_TABLE_NAME = 'Opportunities';

export async function createOpportunitiesTable(
  token: string,
  databaseId: number,
) {
  logger.debug(`[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Start`);

  const table = await createTable(
    databaseId,
    SEED_OPENOPS_TABLE_NAME,
    [['ID']],
    token,
  );

  const fields = await getFields(table.id, token);
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
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );
  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] After adding primary field ID with id: ${primaryField.id}`,
  );

  await addField(token, table.id, {
    name: 'Status',
    type: 'single_select',
    select_options: [
      { value: 'Created', color: 'grey' },
      { value: 'Dismissed', color: 'darker-red' },
      { value: 'Snoozed', color: 'yellow' },
      { value: 'Approved', color: 'dark-green' },
      { value: 'Under review', color: 'pink' },
      { value: 'Completed', color: 'darker-blue' },
    ],
  });

  await addField(token, table.id, {
    name: 'Opportunity Type',
    type: 'single_select',
    select_options: [
      { value: 'Cost anomaly', color: 'darker-green' },
      { value: 'Workflow optimization', color: 'red' },
      { value: 'Rate optimization', color: 'darker-orange' },
    ],
  });

  await addField(token, table.id, {
    name: 'Estimated savings USD per month',
    type: 'number',
    number_decimal_places: 2,
  });

  const fieldNames = [
    'Resource Id',
    'Workflow',
    'Service',
    'Region',
    'Account',
    'Owner',
    'Follow-up task',
    'Opportunity generator',
    'External Opportunity Id',
  ];

  for (const fieldName of fieldNames) {
    await addField(token, table.id, { name: fieldName, type: 'text' });
  }

  await addField(token, table.id, {
    name: 'Complexity',
    type: 'single_select',
    select_options: [
      { value: 'XS', color: 'darker-green' },
      { value: 'S', color: 'dark-cyan' },
      { value: 'M', color: 'grey' },
      { value: 'L', color: 'darker-orange' },
      { value: 'XL', color: 'darker-red' },
    ],
  });

  await addField(token, table.id, {
    name: 'Risk',
    type: 'single_select',
    select_options: [
      { value: 'Low', color: 'darker-green' },
      { value: 'Medium', color: 'yellow' },
      { value: 'High', color: 'darker-red' },
    ],
  });

  await addField(token, table.id, {
    name: 'Opportunity details',
    type: 'long_text',
  });

  await addField(token, table.id, {
    name: 'Snoozed until',
    type: 'date',
    date_format: 'ISO',
    date_include_time: true,
  });

  await addField(token, table.id, {
    name: 'Resolution notes',
    type: 'long_text',
  });

  await addField(token, table.id, {
    name: 'Creation time',
    type: 'created_on',
    date_format: 'ISO',
    date_include_time: true,
  });

  await addField(token, table.id, {
    name: 'Last modified time',
    type: 'last_modified',
    date_format: 'ISO',
    date_include_time: true,
  });

  logger.debug(`[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Done`);
}

async function addField(token: string, tableId: number, fieldBody: any) {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] Before adding field ${fieldBody.name}`,
  );
  const field = await makeOpenOpsTablesPost<{ id: number }>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
    axiosTablesSeedRetryConfig,
  );

  logger.debug(
    `[Seeding ${SEED_OPENOPS_TABLE_NAME} table] After adding field ${fieldBody.name} with id: ${field.id}`,
  );
}
