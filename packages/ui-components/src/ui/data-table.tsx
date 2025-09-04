'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { t } from 'i18next';
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDeepCompareEffect } from 'react-use';

import { SeekPage } from '@openops/shared';

import { cn } from '../lib/cn';
import { Button } from './button';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableFacetedFilter } from './data-table-options-filter';
import { DataTableSkeleton } from './data-table-skeleton';
import { DataTableToolbar } from './data-table-toolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { INTERNAL_ERROR_TOAST, toast } from './use-toast';

export type DataWithId = {
  id?: string;
};
export type RowDataWithActions<TData extends DataWithId> = TData & {
  delete: () => void;
  update: (payload: Partial<TData>) => void;
};

type FilterRecord<Keys extends string, F extends DataTableFilter<Keys>[]> = {
  [K in F[number] as K['accessorKey']]: K['type'] extends 'select'
    ? K['options'][number]['value'][]
    : K['options'][number]['value'];
};

export type DataTableFilter<Keys extends string> = {
  type: 'select' | 'input' | 'date';
  title: string;
  accessorKey: Keys;
  icon: React.ComponentType<{ className?: string }>;
  options: readonly {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
};

type DataTableAction<TData extends DataWithId> = (
  row: RowDataWithActions<TData>,
) => JSX.Element;

export type PaginationParams = {
  cursor?: string;
  limit?: number;
  createdAfter?: string;
  createdBefore?: string;
};

interface DataTableProps<
  TData extends DataWithId,
  TValue,
  Keys extends string,
  F extends DataTableFilter<Keys>[],
> {
  columns: ColumnDef<RowDataWithActions<TData>, TValue>[];
  columnVisibility?: VisibilityState;
  fetchData?: (
    filters: FilterRecord<Keys, F>,
    pagination: PaginationParams,
  ) => Promise<SeekPage<TData>>;
  data?: TData[];
  loading?: boolean;
  // showPagination?: boolean;
  onRowClick?: (
    row: RowDataWithActions<TData>,
    e: React.MouseEvent<HTMLTableRowElement, MouseEvent>,
  ) => void;
  filters?: [...F];
  refresh?: boolean;
  onSelectedRowsChange?: (rows: RowDataWithActions<TData>[]) => void;
  actions?: DataTableAction<TData>[];
  stickyHeader?: boolean;
  border?: boolean;
  emptyStateComponent?: React.ReactNode;
  getRowHref?: (row: RowDataWithActions<TData>) => string | undefined;
}

export function DataTable<
  TData extends DataWithId,
  TValue,
  Keys extends string,
  F extends DataTableFilter<Keys>[],
>({
  columns: columnsInitial,
  columnVisibility,
  data,
  loading,
  fetchData,
  onRowClick,
  filters,
  refresh,
  actions = [],
  onSelectedRowsChange,
  stickyHeader = false,
  border = true,
  emptyStateComponent,
  getRowHref,
}: DataTableProps<TData, TValue, Keys, F>) {
  const columns = columnsInitial.concat([
    {
      accessorKey: '__actions',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-end justify-end gap-4">
            {actions.map((action, index) => {
              return (
                <React.Fragment key={index}>
                  {action(row.original)}
                </React.Fragment>
              );
            })}
          </div>
        );
      },
    },
  ]);

  const [searchParams, setSearchParams] = useSearchParams();
  const startingCursor = searchParams.get('cursor') || undefined;
  const startingLimit = searchParams.get('limit') || '10';
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(
    startingCursor,
  );
  const [nextPageCursor, setNextPageCursor] = useState<string | undefined>(
    undefined,
  );
  const [previousPageCursor, setPreviousPageCursor] = useState<
    string | undefined
  >(undefined);

  const mapDataWithActions = useCallback(
    (rows: TData[]) =>
      rows.map((row, index) => ({
        ...row,
        delete: () => {
          setDeletedRows((prevDeletedRows) => [...prevDeletedRows, row]);
        },
        update: (payload: Partial<TData>) => {
          setTableData((prevData) => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], ...payload };
            return newData;
          });
        },
      })),
    [],
  );

  const [tableData, setTableData] = useState<RowDataWithActions<TData>[]>(
    data ? mapDataWithActions(data) : [],
  );
  const [deletedRows = [], setDeletedRows] = useState<TData[]>([]);
  const [internalLoading, setLoading] = useState<boolean>(true);

  const fetchDataAndUpdateState = async (params: URLSearchParams) => {
    if (!fetchData) return;

    setLoading(true);
    setTableData([]);
    try {
      const limit = params.get('limit') ?? undefined;
      const filterNames = (filters ?? []).map((filter) => filter.accessorKey);
      const paramsObject = filterNames
        .map((key) => [key, params.getAll(key)] as const)
        .reduce((acc, [key, values]) => {
          const value = values.length === 1 ? values?.[0] || undefined : values;
          if (!value) {
            return acc;
          }
          return { ...acc, [key]: value };
        }, {} as FilterRecord<Keys, F>);

      const response = await fetchData(paramsObject, {
        cursor: params.get('cursor') ?? undefined,
        limit: limit ? parseInt(limit) : undefined,
        createdAfter: params.get('createdAfter') ?? undefined,
        createdBefore: params.get('createdBefore') ?? undefined,
      });

      const newData = mapDataWithActions(response.data);

      setTableData(newData);
      setNextPageCursor(response.next ?? undefined);
      setPreviousPageCursor(response.previous ?? undefined);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast(INTERNAL_ERROR_TOAST);
    } finally {
      setLoading(false);
    }
  };

  const table = useReactTable({
    data: tableData,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: parseInt(startingLimit),
      },
    },
  });

  useEffect(() => {
    if (data) {
      setTableData(mapDataWithActions(data));
    }
  }, [data]);

  useEffect(() => {
    filters?.forEach((filter) => {
      const column = table.getColumn(filter.accessorKey);
      const values = searchParams.getAll(filter.accessorKey);
      if (column && values) {
        column.setFilterValue(values);
      }
    });
  }, []);

  useDeepCompareEffect(() => {
    onSelectedRowsChange?.(
      table.getSelectedRowModel().rows.map((row) => row.original),
    );
  }, [table.getSelectedRowModel().rows]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        if (currentCursor) {
          newParams.set('cursor', currentCursor);
        }
        newParams.set('limit', `${table.getState().pagination.pageSize}`);
        return newParams;
      },
      { replace: true },
    );
  }, [currentCursor, table.getState().pagination.pageSize]);

  useEffect(() => {
    if (fetchData) {
      fetchDataAndUpdateState(searchParams);
    }
  }, [searchParams, refresh, fetchData]);

  useEffect(() => {
    setTableData(
      tableData.filter(
        (row) => !deletedRows.some((deletedRow) => deletedRow.id === row.id),
      ),
    );
  }, [deletedRows]);

  const isLoading = loading === undefined ? internalLoading : loading;

  const hasDataFetcher =
    fetchData !== undefined && typeof fetchData === 'function';

  return (
    <div>
      <DataTableToolbar>
        {filters &&
          filters.map((filter) => (
            <DataTableFacetedFilter
              key={filter.accessorKey}
              type={filter.type}
              column={table.getColumn(filter.accessorKey)}
              title={filter.title}
              options={filter.options}
            />
          ))}
      </DataTableToolbar>
      <div
        className={cn({
          'rounded-md border': border,
        })}
      >
        <Table
          parentClassName={cn({
            'overflow-auto': !stickyHeader,
          })}
        >
          <TableHeader
            className={cn({
              'sticky top-0 z-10 bg-background': stickyHeader,
            })}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow data-testid="data-table-loading-row">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <DataTableSkeleton />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowHref = getRowHref?.(row.original);
                return (
                  <TableRow
                    data-testid="data-table-row"
                    onClick={(e) => onRowClick?.(row.original, e)}
                    key={row.id}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {rowHref && cell.column.id !== 'actions' ? (
                          <Link
                            to={rowHref}
                            target="_self"
                            rel="noopener noreferrer"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </Link>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <EmptyState
                columnsLength={columns.length}
                emptyStateComponent={emptyStateComponent}
              />
            )}
          </TableBody>
        </Table>
      </div>
      {hasDataFetcher && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-9 min-w-[70px] w-auto">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentCursor(previousPageCursor)}
            disabled={!previousPageCursor}
          >
            {t('Previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentCursor(nextPageCursor)}
            disabled={!nextPageCursor}
          >
            {t('Next')}
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  columnsLength,
  emptyStateComponent,
}: {
  columnsLength: number;
  emptyStateComponent?: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={columnsLength} className="h-24 text-center">
        {emptyStateComponent ? emptyStateComponent : 'No results.'}
      </TableCell>
    </TableRow>
  );
}
