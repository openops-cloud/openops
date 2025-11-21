import { AppSystemProp, logger, system } from '@openops/server-shared';
import { Semaphore } from 'async-mutex';
import {
  buildSimpleFilterUrlParam,
  FilterType,
  ViewFilterTypesEnum,
} from '../openops-tables/filters';
import {
  createAxiosHeaders,
  createAxiosHeadersForOpenOpsTablesBlock,
  makeOpenOpsTablesDelete,
  makeOpenOpsTablesGet,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
  makeOpenOpsTablesPut,
} from '../openops-tables/requests-helpers';

export interface OpenOpsRow {
  id: number;
  order: string;
}

export interface RowParams {
  tableId: number;
  token: string;
  useDatabaseToken?: boolean;
}

export interface GetRowsParams extends RowParams {
  filters?: { fieldName: string; value: any; type: ViewFilterTypesEnum }[];
  filterType?: FilterType;
}

export interface AddRowParams extends RowParams {
  fields: { [key: string]: any };
}

export interface UpsertRowParams extends RowParams {
  fields: { [key: string]: any };
}

export interface UpdateRowParams extends RowParams {
  fields: { [key: string]: any };
  rowId: number;
}

export interface DeleteRowParams extends RowParams {
  rowId: number;
}

const maxConcurrentJobs = system.getNumber(
  AppSystemProp.MAX_CONCURRENT_TABLES_REQUESTS,
);
class TablesAccessSemaphore {
  private static instance: Semaphore;
  static getInstance(): Semaphore {
    if (!TablesAccessSemaphore.instance) {
      TablesAccessSemaphore.instance = new Semaphore(maxConcurrentJobs ?? 100);
    }
    return TablesAccessSemaphore.instance;
  }
}

const semaphore = TablesAccessSemaphore.getInstance();

async function executeWithConcurrencyLimit<T>(
  fn: () => Promise<T>,
  onError: (error: Error) => void,
): Promise<T> {
  const [value, release] = await semaphore.acquire();
  try {
    return await fn();
  } catch (error) {
    onError(error as Error);
    throw error;
  } finally {
    release();
  }
}

export async function getRows(getRowsParams: GetRowsParams) {
  if (
    getRowsParams.filters &&
    getRowsParams.filters.length > 1 &&
    getRowsParams.filterType == null
  ) {
    throw new Error('Filter type must be provided when filters are provided');
  }

  const params = new URLSearchParams();

  params.append('user_field_names', `true`);
  getRowsParams.filters?.forEach((filter) => {
    params.append(
      `${buildSimpleFilterUrlParam(`${filter.fieldName}`, filter.type)}`,
      `${filter.value}`,
    );
  });
  if (getRowsParams.filterType) {
    params.append('filter_type', `${getRowsParams.filterType}`);
  }

  const paramsString = params.toString();
  const baseUrl = `api/database/rows/table/${getRowsParams.tableId}/`;
  const url = paramsString ? baseUrl + `?${paramsString}` : baseUrl;
  const authenticationHeader = getRowsParams.useDatabaseToken
    ? createAxiosHeadersForOpenOpsTablesBlock(getRowsParams.token)
    : createAxiosHeaders(getRowsParams.token);

  return executeWithConcurrencyLimit(
    async () => {
      const getRowsResult = await makeOpenOpsTablesGet<{ results: any[] }[]>(
        url,
        authenticationHeader,
      );

      return getRowsResult.flatMap((row: any) => row.results);
    },
    (error) => {
      logger.error('Error while getting rows:', {
        error,
        url,
        filters: getRowsParams.filters,
        filterType: getRowsParams.filterType,
      });
    },
  );
}

export async function updateRow(updateRowParams: UpdateRowParams) {
  const url = `api/database/rows/table/${updateRowParams.tableId}/${updateRowParams.rowId}/?user_field_names=true`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = updateRowParams.useDatabaseToken
        ? createAxiosHeadersForOpenOpsTablesBlock(updateRowParams.token)
        : createAxiosHeaders(updateRowParams.token);
      return await makeOpenOpsTablesPatch(
        url,
        updateRowParams.fields,
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while updating row:', {
        error,
        url,
        fields: updateRowParams.fields,
      });
    },
  );
}

export async function upsertRow(upsertRowParams: UpsertRowParams) {
  const url = `api/database/rows/table/${upsertRowParams.tableId}/upsert/?user_field_names=true`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = upsertRowParams.useDatabaseToken
        ? createAxiosHeadersForOpenOpsTablesBlock(upsertRowParams.token)
        : createAxiosHeaders(upsertRowParams.token);
      return await makeOpenOpsTablesPut(
        url,
        upsertRowParams.fields,
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while upserting row:', {
        error,
        url,
        fields: upsertRowParams.fields,
      });
    },
  );
}

export async function addRow(addRowParams: AddRowParams) {
  const url = `api/database/rows/table/${addRowParams.tableId}/?user_field_names=true`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = addRowParams.useDatabaseToken
        ? createAxiosHeadersForOpenOpsTablesBlock(addRowParams.token)
        : createAxiosHeaders(addRowParams.token);
      return await makeOpenOpsTablesPost(
        url,
        addRowParams.fields,
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while adding row:', {
        error,
        url,
        fields: addRowParams.fields,
      });
    },
  );
}

export async function deleteRow(deleteRowParams: DeleteRowParams) {
  const url = `api/database/rows/table/${deleteRowParams.tableId}/${deleteRowParams.rowId}/`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = deleteRowParams.useDatabaseToken
        ? createAxiosHeadersForOpenOpsTablesBlock(deleteRowParams.token)
        : createAxiosHeaders(deleteRowParams.token);
      return await makeOpenOpsTablesDelete(url, authenticationHeader);
    },
    (error) => {
      logger.error('Error while deleting row:', {
        error,
        url,
      });
    },
  );
}

export async function getRowByPrimaryKeyValue(
  token: string,
  tableId: number,
  primaryKeyFieldValue: string,
  primaryKeyFieldName: any,
  primaryKeyFieldType: string,
  useDatabaseToken = false,
) {
  const rows = await getRows({
    tableId: tableId,
    token: token,
    filters: [
      {
        fieldName: primaryKeyFieldName,
        value: primaryKeyFieldValue,
        type: getEqualityFilterType(primaryKeyFieldType),
      },
    ],
    useDatabaseToken,
  });

  if (rows.length > 1) {
    throw new Error('More than one row found with given primary key');
  }

  return rows[0];
}

function getEqualityFilterType(
  primaryKeyFieldType: string,
): ViewFilterTypesEnum {
  if (primaryKeyFieldType === 'date') {
    return ViewFilterTypesEnum.date_equal;
  }

  return ViewFilterTypesEnum.equal;
}
