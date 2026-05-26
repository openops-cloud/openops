import { httpClient, HttpMethod } from '@openops/blocks-common';
import {
  buildServiceNowApiUrl,
  generateAuthHeader,
  ServiceNowAuth,
} from './auth';

export type ServiceNowTableField = {
  name: string;
  column_label: string;
  element: string;
  internal_type?: {
    value: string;
  };
  max_length?: string;
  mandatory?: string;
  read_only?: string;
  primary?: string;
  choice?: string;
  reference?: string;
};

type ServiceNowDbObjectRecord = {
  name: string;
  'super_class.name'?: string;
  super_class?: { link?: string; value?: string; name?: string };
};

async function getServiceNowParentTable(
  auth: ServiceNowAuth,
  tableName: string,
): Promise<string | undefined> {
  const response = await httpClient.sendRequest<{
    result: ServiceNowDbObjectRecord[];
  }>({
    method: HttpMethod.GET,
    url: buildServiceNowApiUrl(auth, 'sys_db_object'),
    headers: {
      ...generateAuthHeader(auth),
      Accept: 'application/json',
    },
    queryParams: {
      sysparm_query: `name=${tableName}`,
      sysparm_fields: 'name,super_class.name,super_class',
      sysparm_limit: '1',
    },
  });

  const record = response.body.result?.[0];
  if (!record) {
    return undefined;
  }

  if (record['super_class.name']) {
    return record['super_class.name'];
  }

  const superClass = record.super_class;
  if (superClass?.name) {
    return superClass.name;
  }

  if (superClass?.value) {
    const parentResponse = await httpClient.sendRequest<{
      result: Array<{ name: string }>;
    }>({
      method: HttpMethod.GET,
      url: buildServiceNowApiUrl(auth, 'sys_db_object'),
      headers: {
        ...generateAuthHeader(auth),
        Accept: 'application/json',
      },
      queryParams: {
        sysparm_query: `sys_id=${superClass.value}`,
        sysparm_fields: 'name',
        sysparm_limit: '1',
      },
    });

    return parentResponse.body.result?.[0]?.name;
  }

  return undefined;
}

async function getServiceNowTableHierarchy(
  auth: ServiceNowAuth,
  tableName: string,
): Promise<string[]> {
  const tables: string[] = [];
  let current: string | undefined = tableName;

  while (current) {
    if (tables.includes(current)) {
      break;
    }

    tables.push(current);
    current = await getServiceNowParentTable(auth, current);
  }

  return tables;
}

function mergeDictionaryFields(
  fields: ServiceNowTableField[],
  tableNames: string[],
): ServiceNowTableField[] {
  const byElement = new Map<string, ServiceNowTableField>();

  for (const field of fields) {
    if (!field.element?.trim()) {
      continue;
    }

    if (field.internal_type?.value === 'collection') {
      continue;
    }

    const tableIndex = tableNames.indexOf(field.name);
    if (tableIndex === -1) {
      continue;
    }

    const existing = byElement.get(field.element);
    if (!existing) {
      byElement.set(field.element, field);
      continue;
    }

    const existingIndex = tableNames.indexOf(existing.name);
    if (tableIndex < existingIndex) {
      byElement.set(field.element, field);
    }
  }

  return [...byElement.values()];
}

export async function getServiceNowTableFields(
  auth: ServiceNowAuth,
  tableName: string,
): Promise<ServiceNowTableField[]> {
  const tableNames = await getServiceNowTableHierarchy(auth, tableName);
  const dictionaryQuery = tableNames.map((name) => `name=${name}`).join('^OR');

  const response = await httpClient.sendRequest<{
    result: ServiceNowTableField[];
  }>({
    method: HttpMethod.GET,
    url: buildServiceNowApiUrl(auth, 'sys_dictionary'),
    headers: {
      ...generateAuthHeader(auth),
      Accept: 'application/json',
    },
    queryParams: {
      sysparm_query: dictionaryQuery,
      sysparm_fields:
        'name,column_label,element,internal_type,max_length,mandatory,read_only,primary,choice,reference',
      sysparm_limit: '5000',
    },
  });

  const fields = response.body.result ?? [];
  return mergeDictionaryFields(fields, tableNames);
}
