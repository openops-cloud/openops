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
  makeOpenOpsTablesRequest,
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

export interface GetRowsPageParams extends RowParams {
  filters?: { fieldName: string; value?: unknown; type: ViewFilterTypesEnum }[];
  filterType?: FilterType;
  orderBy?: { fieldName: string; direction: 'asc' | 'desc' }[];
  includeColumns?: string[];
  search?: string;
  page?: number;
  size?: number;
}

export interface RowsPage {
  count: number;
  page: number;
  size: number;
  hasMore: boolean;
  data: Record<string, unknown>[];
}

const DEFAULT_ROWS_PAGE = 1;
const DEFAULT_ROWS_PAGE_SIZE = 100;

export interface AddRowParams extends RowParams {
  fields: { [key: string]: any };
}

export interface BatchCreateRowsParams extends RowParams {
  items: { [key: string]: any }[];
}

export interface BatchUpdateRowsParams extends RowParams {
  items: {
    rowId: number;
    fields: { [key: string]: any };
  }[];
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
const MAX_BATCH_ROWS = 200;

async function executeWithConcurrencyLimit<T>(
  fn: () => Promise<T>,
  onError: (error: Error) => void,
): Promise<T> {
  const [_value, release] = await semaphore.acquire();
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

// Baserow takes list operators (single_select_is_any_of, ...) as comma-separated values.
function serializeFilterValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(serializeFilterValue).join(',');
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  return JSON.stringify(value) ?? '';
}

/**
 * Fetches a single page of rows. Unlike getRows, this never follows Baserow's `next`
 * links, so callers that expose rows to an agent get a bounded response.
 */
export async function getRowsPage(
  params: GetRowsPageParams,
): Promise<RowsPage> {
  if (
    params.filters &&
    params.filters.length > 1 &&
    params.filterType == null
  ) {
    throw new Error('Filter type must be provided when filters are provided');
  }

  const query = new URLSearchParams();
  query.append('user_field_names', 'true');
  params.filters?.forEach((filter) => {
    query.append(
      buildSimpleFilterUrlParam(filter.fieldName, filter.type),
      serializeFilterValue(filter.value),
    );
  });
  if (params.filterType) {
    query.append('filter_type', params.filterType);
  }
  if (params.orderBy && params.orderBy.length > 0) {
    // Baserow: comma-separated field names, "-" prefix for descending.
    query.append(
      'order_by',
      params.orderBy
        .map((sort) =>
          sort.direction === 'desc' ? `-${sort.fieldName}` : sort.fieldName,
        )
        .join(','),
    );
  }
  if (params.includeColumns && params.includeColumns.length > 0) {
    query.append('include', params.includeColumns.join(','));
  }
  if (params.search) {
    query.append('search', params.search);
  }
  const page = params.page ?? DEFAULT_ROWS_PAGE;
  const size = params.size ?? DEFAULT_ROWS_PAGE_SIZE;
  query.append('page', `${page}`);
  query.append('size', `${size}`);

  const url = `api/database/rows/table/${params.tableId}/?${query.toString()}`;
  const authenticationHeader = createAxiosHeaders(params.tokenOrResolver);

  return executeWithConcurrencyLimit(
    async () => {
      const response = await makeOpenOpsTablesRequest<{
        count: number;
        next: string | null;
        results: Record<string, unknown>[];
      }>('GET', url, undefined, authenticationHeader);

      return {
        count: response.count,
        page,
        size,
        hasMore: response.next !== null && response.next !== undefined,
        data: response.results,
      };
    },
    (error) => {
      logger.error('Error while getting rows page:', {
        error,
        url,
        filters: params.filters,
        filterType: params.filterType,
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

export async function batchCreateRows(
  batchCreateRowsParams: BatchCreateRowsParams,
) {
  if (batchCreateRowsParams.items.length === 0) {
    return [];
  }

  const url = `api/database/rows/table/${batchCreateRowsParams.tableId}/batch/?user_field_names=true`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = createAxiosHeaders(
        batchCreateRowsParams.tokenOrResolver,
      );
      const results = [];

      for (
        let index = 0;
        index < batchCreateRowsParams.items.length;
        index += MAX_BATCH_ROWS
      ) {
        const items = batchCreateRowsParams.items.slice(
          index,
          index + MAX_BATCH_ROWS,
        );

        const response = await makeOpenOpsTablesPost<unknown>(
          url,
          { items },
          authenticationHeader,
        );
        if (Array.isArray(response)) {
          results.push(...response);
        } else if (response != null) {
          results.push(response);
        }
      }

      return results;
    },
    (error) => {
      logger.error('Error while batch creating rows:', {
        error,
        url,
        itemsCount: batchCreateRowsParams.items.length,
      });
    },
  );
}

export async function batchUpdateRows(
  batchUpdateRowsParams: BatchUpdateRowsParams,
) {
  if (batchUpdateRowsParams.items.length === 0) {
    return [];
  }

  const url = `api/database/rows/table/${batchUpdateRowsParams.tableId}/batch/?user_field_names=true`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = createAxiosHeaders(
        batchUpdateRowsParams.tokenOrResolver,
      );
      const results = [];

      for (
        let index = 0;
        index < batchUpdateRowsParams.items.length;
        index += MAX_BATCH_ROWS
      ) {
        const items = batchUpdateRowsParams.items
          .slice(index, index + MAX_BATCH_ROWS)
          .map(({ rowId, fields }) => ({
            id: rowId,
            ...fields,
          }));

        const response = await makeOpenOpsTablesPatch<unknown>(
          url,
          { items },
          authenticationHeader,
        );
        if (Array.isArray(response)) {
          results.push(...response);
        } else if (response != null) {
          results.push(response);
        }
      }

      return results;
    },
    (error) => {
      logger.error('Error while batch updating rows:', {
        error,
        url,
        itemsCount: batchUpdateRowsParams.items.length,
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
  fieldName: string;
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
          filters: (params.filters ?? []).map((filter) => ({
            field: filter.fieldName,
            type: filter.type,
            value: filter.value,
          })),
          aggregations: params.aggregations,
        },
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while posting batch table aggregations:', {
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

      for (
        let index = 0;
        index < params.rowIds.length;
        index += MAX_BATCH_ROWS
      ) {
        const items = params.rowIds.slice(index, index + MAX_BATCH_ROWS);

        await makeOpenOpsTablesPost(url, { items }, authenticationHeader);
      }
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

export async function truncateTable(
  params: RowParams,
): Promise<{ count: number }> {
  const url = `api/database/rows/table/${params.tableId}/truncate/`;

  return executeWithConcurrencyLimit(
    async () => {
      const authenticationHeader = createAxiosHeaders(params.tokenOrResolver);
      return await makeOpenOpsTablesPost<{ count: number }>(
        url,
        {},
        authenticationHeader,
      );
    },
    (error) => {
      logger.error('Error while truncating table:', {
        error,
        url,
        tableId: params.tableId,
      });
    },
  );
}
