import {
  FilterType,
  getAllTablesInDatabase,
  getFields,
  getRowsPage,
  getTableById,
  isSingleValueFilter,
  resolveTokenProvider,
  SelectOpenOpsField,
  TablesServerContext,
  ViewFilterTypesEnum,
} from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';
import {
  ApplicationError,
  ErrorCode,
  QueryTableRowsRequestBody,
  TableColumn,
  TableDetails,
  TableItem,
  TableRowFilter,
  TableRowFilterOperator,
  TableRowSortDirection,
  TableRowsPage,
  throwValidationError,
} from '@openops/shared';
import { projectService } from '../project/project-service';

async function getTablesContext(
  projectId: string,
): Promise<TablesServerContext> {
  const project = await projectService.getOneOrThrow(projectId);
  return {
    tablesDatabaseId: project.tablesDatabaseId,
    tablesDatabaseToken: project.tablesDatabaseToken,
  };
}

/**
 * Every lookup goes through the project's own database, so a table id from another
 * project is simply not found rather than reachable with this project's token.
 */
async function assertTableInProject(
  context: TablesServerContext,
  tableId: number,
): Promise<void> {
  if (!(await getTableById(tableId, context))) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: { entityType: 'table', entityId: tableId.toString() },
    });
  }
}

// Baserow silently returns no rows for a filter, sort or include on a column it does not
// know, which an agent would read as "no data". Fail loudly with the real names instead.
async function assertColumnsExist(
  tableId: number,
  tokenOrResolver: Awaited<ReturnType<typeof resolveTokenProvider>>,
  names: string[],
): Promise<void> {
  const fields = await getFields(tableId, tokenOrResolver);
  const known = new Set(fields.map((field) => field.name));
  const unknown = [...new Set(names.filter((name) => !known.has(name)))];

  if (unknown.length > 0) {
    throwValidationError(
      `Unknown column(s): ${unknown.join(', ')}. ` +
        `Available columns: ${[...known].join(', ')}`,
    );
  }
}

const SELECT_COLUMN_TYPES = new Set(['single_select', 'multiple_select']);

// Baserow treats a value-taking filter with no value as inactive and returns every row,
// which an agent would read as "all rows match". Only empty/not_empty take no value.
function assertFilterValuesPresent(filters: TableRowFilter[]): void {
  const missing = filters
    .filter(
      (filter) =>
        !isSingleValueFilter(toViewFilterType(filter.operator)) &&
        (filter.value === undefined ||
          filter.value === null ||
          filter.value === ''),
    )
    .map((filter) => `${filter.fieldName} (${filter.operator})`);

  if (missing.length > 0) {
    throwValidationError(
      `A value is required for filter(s): ${missing.join(', ')}. ` +
        'Only empty and not_empty take no value.',
    );
  }
}

function getTableUrl(databaseId: number, tableId: number): string {
  const frontendUrl = system
    .getOrThrow<string>(SharedSystemProp.FRONTEND_URL)
    .replace(/\/+$/, '');
  return `${frontendUrl}/tables?path=/database/${databaseId}/table/${tableId}`;
}

type BaserowErrorBody = { error: string; detail?: unknown };

function parseBaserowErrorBody(error: unknown): BaserowErrorBody | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  try {
    const body = JSON.parse(error.message) as Partial<BaserowErrorBody>;
    return typeof body.error === 'string' && body.error.startsWith('ERROR_')
      ? { error: body.error, detail: body.detail }
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The HTTP wrapper drops the status and rethrows Baserow's JSON body as the error
 * message. Baserow 4xx bodies carry an ERROR_* code and a human-readable detail, e.g.
 * ERROR_INVALID_PAGE or ERROR_VIEW_FILTER_TYPE_UNSUPPORTED_FIELD. Surface those as a
 * validation error so an agent can correct its call instead of seeing a generic 500.
 */
function rethrowBaserowClientError(error: unknown): never {
  const body = parseBaserowErrorBody(error);
  if (!body) {
    throw error;
  }
  const detail =
    typeof body.detail === 'string'
      ? body.detail
      : JSON.stringify(body.detail ?? '');
  return throwValidationError(`${body.error}: ${detail}`.trim());
}

// The shared operator enum's values are Baserow's filter names, which are exactly the keys
// of the common package's ViewFilterTypesEnum.
function toViewFilterType(
  operator: TableRowFilterOperator,
): ViewFilterTypesEnum {
  return ViewFilterTypesEnum[operator as keyof typeof ViewFilterTypesEnum];
}

export const tablesService = {
  async listTables(projectId: string): Promise<TableItem[]> {
    const context = await getTablesContext(projectId);
    const tables = await getAllTablesInDatabase(context);
    return tables.map(({ id, name }) => ({ id, name }));
  },

  async getTable(projectId: string, tableId: number): Promise<TableDetails> {
    const context = await getTablesContext(projectId);
    const table = await getTableById(tableId, context);
    if (!table) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: { entityType: 'table', entityId: tableId.toString() },
      });
    }
    return {
      id: table.id,
      name: table.name,
      url: getTableUrl(context.tablesDatabaseId, table.id),
    };
  },

  async listTableColumns(
    projectId: string,
    tableId: number,
  ): Promise<TableColumn[]> {
    const context = await getTablesContext(projectId);
    await assertTableInProject(context, tableId);

    const tokenOrResolver = await resolveTokenProvider(context);
    const fields = await getFields(tableId, tokenOrResolver);
    return fields.map((field) => {
      const column: TableColumn = {
        id: field.id,
        name: field.name,
        type: field.type,
        primary: Boolean(field.primary),
        readOnly: Boolean(field.read_only),
      };
      if (SELECT_COLUMN_TYPES.has(field.type)) {
        column.options = (
          (field as SelectOpenOpsField).select_options ?? []
        ).map(({ id, value }) => ({ id, value }));
      }
      return column;
    });
  },

  async queryTableRows(
    projectId: string,
    tableId: number,
    request: QueryTableRowsRequestBody,
  ): Promise<TableRowsPage> {
    const filters = request.filters ?? [];
    if (filters.length > 1 && !request.filterCombinator) {
      throwValidationError(
        'filterCombinator is required when more than one filter is provided',
      );
    }
    assertFilterValuesPresent(filters);

    const context = await getTablesContext(projectId);
    await assertTableInProject(context, tableId);

    const tokenOrResolver = await resolveTokenProvider(context);
    const referencedColumns = [
      ...filters.map((filter) => filter.fieldName),
      ...(request.orderBy ?? []).map((sort) => sort.fieldName),
      ...(request.columns ?? []),
    ];
    if (referencedColumns.length > 0) {
      await assertColumnsExist(tableId, tokenOrResolver, referencedColumns);
    }

    try {
      return await getRowsPage({
        tableId,
        tokenOrResolver,
        filters: filters.map((filter) => ({
          fieldName: filter.fieldName,
          type: toViewFilterType(filter.operator),
          value: filter.value,
        })),
        filterType: request.filterCombinator as FilterType | undefined,
        orderBy: request.orderBy?.map((sort) => ({
          fieldName: sort.fieldName,
          direction: sort.direction ?? TableRowSortDirection.ASC,
        })),
        includeColumns: request.columns,
        search: request.search,
        page: request.page,
        size: request.size,
      });
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },
};
