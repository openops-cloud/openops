import {
  FilterType,
  getAllTablesInDatabase,
  getFields,
  getRowsPage,
  resolveTokenProvider,
  TablesServerContext,
  ViewFilterTypesEnum,
} from '@openops/common';
import {
  ApplicationError,
  ErrorCode,
  QueryTableRowsRequest,
  TableColumn,
  TableItem,
  TableRowFilter,
  TableRowFilterOperator,
  TableRowsPage,
  throwValidationError,
} from '@openops/shared';
import { projectRepo } from '../project/project-service';

async function getTablesContext(
  projectId: string,
): Promise<TablesServerContext> {
  const project = await projectRepo().findOneByOrFail({ id: projectId });
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
  const tables = await getAllTablesInDatabase(context);
  if (!tables.some((table) => table.id === tableId)) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: { entityType: 'table', entityId: tableId.toString() },
    });
  }
}

// Baserow silently returns no rows for a filter on a column it does not know, which an
// agent would read as "no data". Fail loudly with the real column names instead.
async function assertFilterColumnsExist(
  tableId: number,
  tokenOrResolver: Awaited<ReturnType<typeof resolveTokenProvider>>,
  filters: TableRowFilter[],
): Promise<void> {
  const fields = await getFields(tableId, tokenOrResolver);
  const known = new Set(fields.map((field) => field.name));
  const unknown = filters
    .map((filter) => filter.fieldName)
    .filter((name) => !known.has(name));

  if (unknown.length > 0) {
    throwValidationError(
      `Unknown column(s): ${unknown.join(', ')}. ` +
        `Available columns: ${[...known].join(', ')}`,
    );
  }
}

/**
 * The HTTP wrapper drops the status and rethrows Baserow's JSON body as the error
 * message. Baserow 4xx bodies carry an ERROR_* code and a human-readable detail, e.g.
 * ERROR_INVALID_PAGE or ERROR_VIEW_FILTER_TYPE_UNSUPPORTED_FIELD. Surface those as a
 * validation error so an agent can correct its call instead of seeing a generic 500.
 */
function rethrowBaserowClientError(error: unknown): never {
  if (error instanceof Error) {
    try {
      const body = JSON.parse(error.message) as {
        error?: unknown;
        detail?: unknown;
      };
      if (typeof body.error === 'string' && body.error.startsWith('ERROR_')) {
        const detail =
          typeof body.detail === 'string'
            ? body.detail
            : JSON.stringify(body.detail ?? '');
        throwValidationError(`${body.error}: ${detail}`.trim());
      }
    } catch (parsed) {
      if (parsed instanceof ApplicationError) {
        throw parsed;
      }
    }
  }
  throw error;
}

// The shared operator enum uses Baserow's filter names, which are exactly the keys of
// the common package's ViewFilterTypesEnum.
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

  async listTableColumns(
    projectId: string,
    tableId: number,
  ): Promise<TableColumn[]> {
    const context = await getTablesContext(projectId);
    await assertTableInProject(context, tableId);

    const tokenOrResolver = await resolveTokenProvider(context);
    const fields = await getFields(tableId, tokenOrResolver);
    return fields.map(({ id, name, type, primary, read_only }) => ({
      id,
      name,
      type,
      primary: Boolean(primary),
      readOnly: Boolean(read_only),
    }));
  },

  async queryTableRows(
    projectId: string,
    tableId: number,
    request: QueryTableRowsRequest,
  ): Promise<TableRowsPage> {
    const filters = request.filters ?? [];
    if (filters.length > 1 && !request.filterCombinator) {
      throwValidationError(
        'filterCombinator is required when more than one filter is provided',
      );
    }

    const context = await getTablesContext(projectId);
    await assertTableInProject(context, tableId);

    const tokenOrResolver = await resolveTokenProvider(context);
    if (filters.length > 0) {
      await assertFilterColumnsExist(tableId, tokenOrResolver, filters);
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
        search: request.search,
        page: request.page,
        size: request.size,
      });
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },
};
