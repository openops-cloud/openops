import { ActionContext, PropertyContext } from '@openops/blocks-framework';
import { IAxiosRetryConfig } from 'axios-retry';
import {
  createAxiosHeaders,
  createAxiosHeadersForOpenOpsTablesBlock,
  makeOpenOpsTablesGet,
} from '../openops-tables/requests-helpers';
import { authenticateDefaultUserInOpenOpsTables } from './auth-user';
import {
  getTablesDatabaseTokenFromContext,
  shouldUseDatabaseToken,
} from './context-helpers';
import {
  getTableIdByTableName,
  getTableIdByTableNameFromContext,
} from './tables';

export async function getFieldsFromContext(
  tableId: number,
  context: ActionContext | PropertyContext,
  userFieldNames = true,
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<OpenOpsField[]> {
  if (!shouldUseDatabaseToken()) {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    return await getFields(tableId, token, userFieldNames, axiosRetryConfig);
  }

  const token = getTablesDatabaseTokenFromContext(context);
  const authenticationHeader = createAxiosHeadersForOpenOpsTablesBlock(token);
  const fields = await makeOpenOpsTablesGet<any[]>(
    `api/database/fields/table/${tableId}/?user_field_names=${userFieldNames}`,
    authenticationHeader,
    axiosRetryConfig,
  );
  return fields.flatMap((item) => item);
}

export async function getTableFieldsFromContext(
  tableName: string,
  context: ActionContext | PropertyContext,
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<OpenOpsField[]> {
  if (!shouldUseDatabaseToken()) {
    const { token } = await authenticateDefaultUserInOpenOpsTables();
    const tableId = await getTableIdByTableName(tableName);
    return await getFields(tableId, token, false, axiosRetryConfig);
  }

  const tableId = await getTableIdByTableNameFromContext(tableName, context);
  return getFieldsFromContext(tableId, context, false, axiosRetryConfig);
}

export async function getFields(
  tableId: number,
  token: string,
  userFieldNames = true,
  axiosRetryConfig?: IAxiosRetryConfig,
): Promise<OpenOpsField[]> {
  const authenticationHeader = createAxiosHeaders(token);
  const fields = await makeOpenOpsTablesGet<any[]>(
    `api/database/fields/table/${tableId}/?user_field_names=${userFieldNames}`,
    authenticationHeader,
    axiosRetryConfig,
  );
  return fields.flatMap((item) => item);
}

export interface OpenOpsField {
  id: number;
  name: string;
  type: string;
  primary: boolean;
  description: string;
  read_only: boolean;
}

export interface NumberOpenOpsField extends OpenOpsField {
  number_negative: boolean;
}

export interface RatingOpenOpsField extends OpenOpsField {
  max_value: number;
}

export interface DateOpenOpsField extends OpenOpsField {
  date_format: string;
  date_include_time: boolean;
  date_time_format: string;
}

export interface DurationOpenOpsField extends OpenOpsField {
  duration_format: string;
}

export interface SelectOpenOpsField extends OpenOpsField {
  select_options: { id: number; value: string; color: string }[];
}

export function getPrimaryKeyFieldFromFields(
  fields: OpenOpsField[],
): OpenOpsField {
  const primaryKeyField = fields.find((field) => field.primary === true);
  if (!primaryKeyField) {
    throw new Error('Primary key field not found');
  }

  return primaryKeyField;
}
