import { AppSystemProp, logger, system } from '@openops/server-shared';
import { Semaphore } from 'async-mutex';
import {
  buildSimpleFilterUrlParam,
  FilterType,
  ViewFilterTypesEnum,
} from '../openops-tables/filters';
import {
  makeOpenOpsTablesDelete,
  makeOpenOpsTablesGet,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
  makeOpenOpsTablesPut,
} from '../openops-tables/requests-helpers';
import { TokenOrResolver } from './context-helpers';
import { createAxiosHeaders } from './create-axios-headers';

export interface OpenOpsRow {
  id: number;
  order: string;
}

export interface RowParams {
  tableId: number;
  tokenOrResolver: TokenOrResolver;
}

export interface BatchDeleteRowsParams extends RowParams {
  rowIds: number[];
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
  const authenticationHeader = createAxiosHeaders(
    getRowsParams.tokenOrResolver,
  );

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
      const authenticationHeader = createAxiosHeaders(
        updateRowParams.tokenOrResolver,
      );
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
      const authenticationHeader = createAxiosHeaders(
        upsertRowParams.tokenOrResolver,
      );
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
      const authenticationHeader = createAxiosHeaders(
        addRowParams.tokenOrResolver,
      );
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
      const authenticationHeader = createAxiosHeaders(
        deleteRowParams.tokenOrResolver,
      );
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
  tokenOrResolver: TokenOrResolver,
  tableId: number,
  primaryKeyFieldValue: string,
  primaryKeyFieldName: any,
  primaryKeyFieldType: string,
) {
  const rows = await getRows({
    tableId: tableId,
    filters: [
      {
        fieldName: primaryKeyFieldName,
        value: primaryKeyFieldValue,
        type: getEqualityFilterType(primaryKeyFieldType),
      },
    ],
    tokenOrResolver,
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

export type AggregationSpec =
  | { type: 'count' }
  | { type: 'sum'; field: string }
  | { type: 'distinct_values'; field: string };

export interface TableFilter {
  field: string;
  type: 'not_in';
  value: string[];
}

export interface BatchTableAggregationsParams {
  tokenOrResolver: TokenOrResolver;
  tableIds: number[];
  filters?: TableFilter[];
  aggregations: AggregationSpec[];
}

export type TableAggregationResult = {
  count?: number;
  [key: string]: number | string[] | undefined;
};

export type BatchTableAggregationsResult = Record<
  string,
  TableAggregationResult
>;

export async function batchTableAggregations(
  params: BatchTableAggregationsParams,
): Promise<BatchTableAggregationsResult> {
  const url = 'api/database/rows/batch-aggregations/';

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = createAxiosHeaders(params.tokenOrResolver);
      return await makeOpenOpsTablesPost<BatchTableAggregationsResult>(
        url,
        {
          table_ids: params.tableIds,
          filters: params.filters ?? [],
          aggregations: params.aggregations,
        },
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while getting batch table aggregations:', {
        error,
        url,
        tableIds: params.tableIds,
      });
    },
  );
}

export async function batchDeleteRows(
  params: BatchDeleteRowsParams,
): Promise<void> {
  if (params.rowIds.length === 0) {
    return;
  }

  const url = `api/database/rows/table/${params.tableId}/batch-delete/`;

  await executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = createAxiosHeaders(params.tokenOrResolver);
      return await makeOpenOpsTablesPost(
        url,
        { items: params.rowIds },
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while batch deleting rows:', {
        error,
        url,
        rowIdsCount: params.rowIds.length,
        rowIdsSample: params.rowIds.slice(0, 10),
      });
    },
  );
}
