import { httpClient, HttpMethod } from '@openops/blocks-common';
import { Property, Validators } from '@openops/blocks-framework';
import { FilterType, ViewFilterTypesEnum } from '@openops/common';
import { logger } from '@openops/server-shared';
import { ServiceNowAuth } from '../lib/auth';
import { buildServiceNowApiUrl } from '../lib/build-api-url';
import { buildServiceNowQuery } from '../lib/filter-to-query';
import { generateAuthHeader } from '../lib/generate-auth-header';

type RecordType = 'record' | 'request';

export const limitProperty = Property.Number({
  displayName: 'Limit',
  description: 'Maximum number of records to return. Default is 10000.',
  required: true,
  defaultValue: 10000,
  validators: [Validators.minValue(1)],
});

interface DeleteRecordParams {
  auth: ServiceNowAuth;
  tableName: string;
  sysId: string;
  recordType: RecordType;
}

interface GetRecordParams {
  auth: ServiceNowAuth;
  tableName: string;
  sysId: string;
  fields?: string[];
}

interface GetRecordsParams {
  auth: ServiceNowAuth;
  tableName: string;
  filters?: {
    fieldName: string;
    value: unknown;
    filterType: ViewFilterTypesEnum;
  }[];
  filterType?: FilterType;
  limit?: number;
  fields?: string[];
}

interface UpsertRecordParams {
  auth: ServiceNowAuth;
  tableName: string;
  sysId?: string;
  body: Record<string, unknown>;
}

function buildAuthHeaders(auth: ServiceNowAuth) {
  return {
    ...generateAuthHeader({
      username: auth.username,
      password: auth.password,
    }),
    Accept: 'application/json',
  };
}

function buildAuthHeadersWithContentType(auth: ServiceNowAuth) {
  return {
    ...buildAuthHeaders(auth),
    'Content-Type': 'application/json',
  };
}

export async function runDeleteRecordAction(
  params: DeleteRecordParams,
): Promise<{ success: boolean; message: string }> {
  const { auth, tableName, sysId, recordType } = params;

  await httpClient.sendRequest({
    method: HttpMethod.DELETE,
    url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
    headers: buildAuthHeaders(auth),
  });

  const recordTypeLabel = recordType === 'record' ? 'record' : 'request';
  return {
    success: true,
    message: `The ${recordTypeLabel} with id "${sysId}" was deleted`,
  };
}

export async function runGetRecordAction(
  params: GetRecordParams,
): Promise<unknown> {
  const { auth, tableName, sysId, fields } = params;

  const queryParams: Record<string, string> = {};

  if (Array.isArray(fields) && fields.length) {
    queryParams['sysparm_fields'] = fields.join(',');
  }

  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
    headers: buildAuthHeaders(auth),
    queryParams,
  });

  return response.body;
}

export async function runGetRecordsAction(
  params: GetRecordsParams,
): Promise<unknown> {
  const { auth, tableName, filters, filterType, limit, fields } = params;

  const queryParams: Record<string, string> = {};

  if (filters && filters.length > 0) {
    const query = buildServiceNowQuery(filters, filterType || FilterType.AND);

    if (query) {
      queryParams['sysparm_query'] = query;
    }
  }

  if (limit !== undefined && limit !== null) {
    queryParams['sysparm_limit'] = String(limit);
  }

  if (Array.isArray(fields) && fields.length) {
    queryParams['sysparm_fields'] = fields.join(',');
  }

  const response = await httpClient.sendRequest({
    method: HttpMethod.GET,
    url: buildServiceNowApiUrl(auth, tableName),
    headers: buildAuthHeaders(auth),
    queryParams,
  });

  return response.body;
}

export async function runUpsertRecordAction(
  params: UpsertRecordParams,
): Promise<unknown> {
  const { auth, tableName, sysId, body } = params;

  let recordToUpdate: unknown = undefined;

  if (sysId && typeof sysId === 'string' && sysId.trim() !== '') {
    try {
      const getResponse = await httpClient.sendRequest({
        method: HttpMethod.GET,
        url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
        headers: buildAuthHeaders(auth),
      });

      if (getResponse.body?.result) {
        recordToUpdate = getResponse.body.result;
      }
    } catch (error) {
      logger.debug(`Unable to retrieve record with sys_id = ${sysId}`, {
        error,
      });
      recordToUpdate = undefined;
    }
  }

  if (recordToUpdate) {
    const response = await httpClient.sendRequest({
      method: HttpMethod.PATCH,
      url: buildServiceNowApiUrl(auth, `${tableName}/${sysId}`),
      headers: buildAuthHeadersWithContentType(auth),
      body,
    });

    return response.body;
  }

  const response = await httpClient.sendRequest({
    method: HttpMethod.POST,
    url: buildServiceNowApiUrl(auth, tableName),
    headers: buildAuthHeadersWithContentType(auth),
    body,
  });

  return response.body;
}

export function buildFieldsBody(
  fieldsProperties: unknown,
): Record<string, unknown> {
  const fields =
    ((fieldsProperties as any)?.['fieldsProperties'] as unknown as {
      fieldName: string;
      fieldValue: unknown;
    }[]) ?? [];

  const body: Record<string, unknown> = {};
  for (const { fieldName, fieldValue } of fields) {
    body[fieldName] = (fieldValue as Record<string, unknown>)['fieldValue'];
  }

  return body;
}

export function extractFiltersFromProps(filtersProps: unknown):
  | {
      fieldName: string;
      value: unknown;
      filterType: ViewFilterTypesEnum;
    }[]
  | undefined {
  const filters = filtersProps as
    | {
        fieldName: string;
        value: { value: unknown };
        filterType: ViewFilterTypesEnum;
      }[]
    | undefined;

  if (!filters || filters.length === 0) {
    return undefined;
  }

  return filters.map((filter) => ({
    fieldName: filter.fieldName,
    value: filter.value['value'],
    filterType: filter.filterType,
  }));
}
