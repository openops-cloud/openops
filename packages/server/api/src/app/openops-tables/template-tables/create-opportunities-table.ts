/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createAxiosHeaders,
  getFields,
  getPrimaryKeyFieldFromFields,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '@openops/common';
import { openopsTables, SEED_OPENOPS_TABLE_NAME } from '../index';

export async function createOpportunitiesTable(
  token: string,
  databaseId: number,
) {
  const table = await openopsTables.createTable(
    databaseId,
    SEED_OPENOPS_TABLE_NAME,
    [['ID']],
    token,
  );

  const fields = await getFields(table.id, token);
  const primaryField = getPrimaryKeyFieldFromFields(fields);

  await makeOpenOpsTablesPatch<unknown>(
    `api/database/fields/${primaryField.id}/`,
    {
      name: 'ID',
      type: 'uuid',
    },
    createAxiosHeaders(token),
  );

  await AddField(token, table.id, {
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

  await AddField(token, table.id, {
    name: 'Opportunity Type',
    type: 'single_select',
    select_options: [
      { value: 'Cost anomaly', color: 'darker-green' },
      { value: 'Workflow optimization', color: 'red' },
      { value: 'Rate optimization', color: 'darker-orange' },
    ],
  });

  await AddField(token, table.id, {
    name: 'Workflow',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Resource ID',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Service',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Region',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Account',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Complexity',
    type: 'text',
    select_options: [
      { value: 'XS', color: 'darker-green' },
      { value: 'S', color: 'dark-cyan' },
      { value: 'M', color: 'grey' },
      { value: 'L', color: 'darker-orange' },
      { value: 'XL', color: 'darker-red' },
    ],
  });

  await AddField(token, table.id, {
    name: 'Risk',
    type: 'text',
    select_options: [
      { value: 'Low', color: 'darker-green' },
      { value: 'Medium', color: 'yellow' },
      { value: 'High', color: 'darker-red' },
    ],
  });

  await AddField(token, table.id, {
    name: 'Owner',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Follow-up task',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Opporunity generator',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'External Opportunity Id',
    type: 'text',
  });

  await AddField(token, table.id, {
    name: 'Opportunity details',
    type: 'long_text',
  });

  await AddField(token, table.id, {
    name: 'Snoozed until',
    type: 'date',
    date_format: 'ISO',
    date_include_time: true,
  });

  await AddField(token, table.id, {
    name: 'Resolution notes',
    type: 'long_text',
  });

  await AddField(token, table.id, {
    name: 'Creation time',
    type: 'created_on',
    date_format: 'ISO',
    date_include_time: true,
  });

  await AddField(token, table.id, {
    name: 'Last modified time',
    type: 'last_modified',
    date_format: 'ISO',
    date_include_time: true,
  });
}

async function AddField(token: string, tableId: number, fieldBody: any) {
  const createFieldEndpoint = `api/database/fields/table/${tableId}/`;

  await makeOpenOpsTablesPost<unknown>(
    createFieldEndpoint,
    fieldBody,
    createAxiosHeaders(token),
  );
}
