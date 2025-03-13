import { AppSystemProp, logger, system } from '@openops/server-shared';
import { Semaphore } from 'async-mutex';
import {
  buildSimpleFilterUrlParam,
  FilterType,
  ViewFilterTypesEnum,
} from '../openops-tables/filters';
import {
  createAxiosHeaders,
  makeOpenOpsTablesDelete,
  makeOpenOpsTablesGet,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
} from '../openops-tables/requests-helpers';

export interface OpenOpsRow {
  id: number;
  order: string;
}

export interface RowParams {
  tableId: number;
  token: string;
}

export interface GetRowsParams extends RowParams {
  filters?: { fieldName: string; value: any; type: ViewFilterTypesEnum }[];
  filterType?: FilterType;
}

export interface AddRowParams extends RowParams {
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
): Promise<T> {
  const [value, release] = await semaphore.acquire();
  try {
    return await fn();
  } catch (error) {
    logger.error('Error in locked row operation:', error);
    throw error;
  } finally {
    release();
  }
}

export async function getRows(getRowsParams: GetRowsParams) {
  return executeWithConcurrencyLimit(async () => {
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

    const authenticationHeader = createAxiosHeaders(getRowsParams.token);
    const getRowsResult = await makeOpenOpsTablesGet<{ results: any[] }[]>(
      url,
      authenticationHeader,
    );

    return getRowsResult.flatMap((row: any) => row.results);
  });
}

export async function updateRow(updateRowParams: UpdateRowParams) {
  return executeWithConcurrencyLimit(async () => {
    const authenticationHeader = createAxiosHeaders(updateRowParams.token);
    return await makeOpenOpsTablesPatch(
      `api/database/rows/table/${updateRowParams.tableId}/${updateRowParams.rowId}/?user_field_names=true`,
      updateRowParams.fields,
      authenticationHeader,
    );
  });
}

export async function addRow(addRowParams: AddRowParams) {
  return executeWithConcurrencyLimit(async () => {
    const authenticationHeader = createAxiosHeaders(addRowParams.token);
    return await makeOpenOpsTablesPost(
      `api/database/rows/table/${addRowParams.tableId}/?user_field_names=true`,
      addRowParams.fields,
      authenticationHeader,
    );
  });
}

export async function deleteRow(deleteRowParams: DeleteRowParams) {
  return executeWithConcurrencyLimit(async () => {
    const authenticationHeader = createAxiosHeaders(deleteRowParams.token);
    return await makeOpenOpsTablesDelete(
      `api/database/rows/table/${deleteRowParams.tableId}/${deleteRowParams.rowId}/`,
      authenticationHeader,
    );
  });
}

export async function getRowByPrimaryKeyValue(
  token: string,
  tableId: number,
  primaryKeyFieldValue: string,
  primaryKeyFieldName: any,
) {
  const rows = await getRows({
    tableId: tableId,
    token: token,
    filters: [
      {
        fieldName: primaryKeyFieldName,
        value: primaryKeyFieldValue,
        type: ViewFilterTypesEnum.equal,
      },
    ],
  });

  if (rows.length > 1) {
    throw new Error('More than one row found with given primary key');
  }

  return rows[0];
}
