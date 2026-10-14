import {
  batchCreateRows,
  batchDeleteRows,
  batchUpdateRows,
  createAxiosHeaders,
  FilterType,
  getAllTablesInDatabase,
  getFields,
  getRowsPage,
  getTableById,
  isSingleValueFilter,
  makeOpenOpsTablesDelete,
  makeOpenOpsTablesPatch,
  makeOpenOpsTablesPost,
  resolveTokenProvider,
  SelectOpenOpsField,
  TablesServerContext,
  TokenOrResolver,
  ViewFilterTypesEnum,
} from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';
import {
  AddTableColumnRequestBody,
  ApplicationError,
  CreateTableRequestBody,
  CreateTableRowsRequestBody,
  ErrorCode,
  QueryTableRowsRequestBody,
  TableColumn,
  TableColumnDeleteResult,
  TableColumnType,
  TableDetails,
  TableItem,
  TableRowFilter,
  TableRowFilterOperator,
  TableRowsDeleteResult,
  TableRowSortDirection,
  TableRowsPage,
  TableRowsWriteResult,
  throwValidationError,
  UpdateTableColumnRequestBody,
  UpdateTableRowsRequestBody,
} from '@openops/shared';
import { stripTrailingSlashes } from '../oauth/common/canonical-url';
import { createTable } from '../openops-tables/create-table';
import { projectService } from '../project/project-service';

type RowFields = Record<string, unknown>;

async function getTablesContext(
  projectId: string,
): Promise<TablesServerContext> {
  const project = await projectService.getOneOrThrow(projectId);
  return {
    tablesDatabaseId: project.tablesDatabaseId,
    tablesDatabaseToken: project.tablesDatabaseToken,
  };
}

async function getTokenResolver(projectId: string): Promise<TokenOrResolver> {
  return resolveTokenProvider(await getTablesContext(projectId));
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

const SELECT_COLUMN_TYPES = new Set<string>([
  TableColumnType.SINGLE_SELECT,
  TableColumnType.MULTIPLE_SELECT,
]);

type BaserowField = Partial<SelectOpenOpsField> & {
  id: number;
  name: string;
  type: string;
};

// The column shape Get Table Columns returns, also returned by the column writes.
function toTableColumn(field: BaserowField): TableColumn {
  const column: TableColumn = {
    id: field.id,
    name: field.name,
    type: field.type,
    primary: Boolean(field.primary),
    readOnly: Boolean(field.read_only),
  };
  if (SELECT_COLUMN_TYPES.has(field.type)) {
    column.options = (field.select_options ?? []).map(({ id, value }) => ({
      id,
      value,
    }));
  }
  return column;
}

// Baserow treats a value-taking filter with no value as inactive and returns every row,
// which an agent would read as "all rows match". Only empty/not_empty take no value.
function assertFilterValuesPresent(filters: TableRowFilter[]): void {
  const missing = filters
    .filter(
      (filter) =>
        !isSingleValueFilter(toViewFilterType(filter.operator)) &&
        (filter.value === undefined ||
          filter.value === null ||
          filter.value === '' ||
          (Array.isArray(filter.value) && filter.value.length === 0)),
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
  const frontendUrl = stripTrailingSlashes(
    system.getOrThrow<string>(SharedSystemProp.FRONTEND_URL),
  );
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

// Baserow field errors are `[{ error, code }]` per column, nested one level further by
// item index for list-valued columns (multiple select, link row). Collect the messages.
function collectFieldErrorMessages(errors: unknown): string[] {
  if (Array.isArray(errors)) {
    return errors.flatMap(collectFieldErrorMessages);
  }
  if (errors && typeof errors === 'object') {
    if ('error' in errors) {
      return collectFieldErrorMessages((errors as { error: unknown }).error);
    }
    return Object.values(errors).flatMap(collectFieldErrorMessages);
  }
  if (typeof errors === 'string') {
    return [errors];
  }
  if (typeof errors === 'number' || typeof errors === 'boolean') {
    return [errors.toString()];
  }
  return [];
}

// One row's `{ <column>: errors }` map as "column: message" parts.
function formatRowErrors(columns: Record<string, unknown>): string[] {
  return Object.entries(columns).map(
    ([column, errors]) =>
      `${column}: ${collectFieldErrorMessages(errors).join('; ')}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// ERROR_REQUEST_BODY_VALIDATION carries `{ items: { <rowIndex>: { <column>: errors } } }`
// for batch writes. Flatten it to "row N, column: message"; anything else is stringified
// as-is.
function formatBaserowDetail(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail;
  }
  if (isRecord(detail) && isRecord(detail['items'])) {
    const lines = Object.entries(detail['items']).flatMap(([index, columns]) =>
      isRecord(columns)
        ? formatRowErrors(columns).map(
            (part) => `row ${Number(index) + 1}, ${part}`,
          )
        : [],
    );
    if (lines.length > 0) {
      return lines.join(' | ');
    }
  }
  return JSON.stringify(detail ?? '');
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
  return throwValidationError(
    `${body.error}: ${formatBaserowDetail(body.detail)}`.trim(),
  );
}

// The shared operator enum's values are Baserow's filter names, which are exactly the keys
// of the common package's ViewFilterTypesEnum.
function toViewFilterType(
  operator: TableRowFilterOperator,
): ViewFilterTypesEnum {
  return ViewFilterTypesEnum[operator as keyof typeof ViewFilterTypesEnum];
}

/**
 * Checks the table belongs to the project (listTableColumns throws ENTITY_NOT_FOUND
 * otherwise) and that every column being written exists and is writable. Baserow would
 * silently ignore unknown keys and reject read-only ones with a generic 400, neither of
 * which tells an agent what to fix.
 */
async function assertWritableColumns(
  projectId: string,
  tableId: number,
  rows: RowFields[],
): Promise<void> {
  if (rows.some((row) => Object.keys(row).length === 0)) {
    throwValidationError('Each row must set at least one column');
  }

  const columns = await tablesService.listTableColumns(projectId, tableId);
  const byName = new Map(columns.map((column) => [column.name, column]));
  const unknown = new Set<string>();
  const readOnly = new Set<string>();

  for (const row of rows) {
    for (const name of Object.keys(row)) {
      const column = byName.get(name);
      if (!column) {
        unknown.add(name);
      } else if (column.readOnly) {
        readOnly.add(name);
      }
    }
  }

  if (unknown.size > 0) {
    const writable = columns.filter((c) => !c.readOnly).map((c) => c.name);
    throwValidationError(
      `Unknown column(s): ${[...unknown].join(', ')}. ` +
        `Writable columns: ${writable.join(', ')}`,
    );
  }
  if (readOnly.size > 0) {
    throwValidationError(
      `Read-only column(s) cannot be written: ${[...readOnly].join(', ')}`,
    );
  }
}

// The batch helpers return one raw Baserow response per 200-row chunk, each shaped
// `{ items: [...] }`. Flatten them into the rows the agent asked about.
function flattenBatchResults(chunks: unknown[]): RowFields[] {
  return chunks.flatMap((chunk) => {
    if (Array.isArray(chunk)) {
      return chunk as RowFields[];
    }
    if (chunk && typeof chunk === 'object' && 'items' in chunk) {
      const items = (chunk as { items?: unknown }).items;
      return Array.isArray(items) ? (items as RowFields[]) : [];
    }
    return chunk ? [chunk as RowFields] : [];
  });
}

// Baserow echoes the whole row (every column, mostly null on wide campaign tables). The
// caller already knows what it sent, so return the id plus the columns it wrote; Query
// Table Rows gives the full row when needed.
function pickWrittenColumns(row: RowFields, written: RowFields): RowFields {
  const picked: RowFields = { id: row['id'] };
  for (const name of Object.keys(written)) {
    picked[name] = row[name];
  }
  return picked;
}

// Schema (table and column) writes.

type ColumnTypeOptions = Pick<
  AddTableColumnRequestBody,
  'selectOptions' | 'decimalPlaces' | 'includeTime'
>;

// Baserow requires a color per select option; these are names from the fork's palette.
const OPTION_COLORS = [
  'blue',
  'green',
  'orange',
  'red',
  'purple',
  'yellow',
  'cyan',
  'pink',
  'brown',
  'gray',
];

// The fork accepts repeated select option labels, which would make writing a cell by its
// label ambiguous.
function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

// The fork rejects blank and repeated header names itself, but a row longer than the
// header would get extra "Field N" columns the agent did not ask for.
function assertRowsMatchHeader(data: string[][]): void {
  const [header, ...rows] = data;
  rows.forEach((row, index) => {
    if (row.length !== header.length) {
      throwValidationError(
        `Data row ${index + 1} has ${row.length} cell(s); the header has ${
          header.length
        }`,
      );
    }
  });
}

// Baserow silently ignores options that do not apply to the field type.
function assertOptionsMatchType(
  type: string,
  options: ColumnTypeOptions,
): void {
  if (options.selectOptions !== undefined) {
    if (!SELECT_COLUMN_TYPES.has(type)) {
      throwValidationError(
        'selectOptions only applies to single_select and multiple_select columns',
      );
    }
    const duplicates = findDuplicates(options.selectOptions);
    if (duplicates.length > 0) {
      throwValidationError(`Duplicate option(s): ${duplicates.join(', ')}`);
    }
  }
  if (options.decimalPlaces !== undefined && type !== TableColumnType.NUMBER) {
    throwValidationError('decimalPlaces only applies to number columns');
  }
  if (options.includeTime !== undefined && type !== TableColumnType.DATE) {
    throwValidationError('includeTime only applies to date columns');
  }
}

// Options are sent as the full list. Reusing the id of an existing label keeps the cells
// that hold it; a label without an id becomes a new option.
function toBaserowSelectOptions(
  labels: string[],
  existing: SelectOpenOpsField['select_options'] = [],
): Record<string, unknown>[] {
  const byLabel = new Map(existing.map((option) => [option.value, option]));
  return labels.map((value, index) => {
    const current = byLabel.get(value);
    return current
      ? { id: current.id, value, color: current.color }
      : { value, color: OPTION_COLORS[index % OPTION_COLORS.length] };
  });
}

function toBaserowFieldBody(
  body: Partial<AddTableColumnRequestBody>,
  existingOptions?: SelectOpenOpsField['select_options'],
): Record<string, unknown> {
  return {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.type !== undefined && { type: body.type }),
    ...(body.selectOptions !== undefined && {
      select_options: toBaserowSelectOptions(
        body.selectOptions,
        existingOptions,
      ),
    }),
    ...(body.decimalPlaces !== undefined && {
      number_decimal_places: body.decimalPlaces,
    }),
    ...(body.includeTime !== undefined && {
      date_include_time: body.includeTime,
    }),
  };
}

async function getColumnOrThrow(
  projectId: string,
  tableId: number,
  columnId: number,
): Promise<TableColumn> {
  // listTableColumns checks the table belongs to the project.
  const columns = await tablesService.listTableColumns(projectId, tableId);
  const column = columns.find((c) => c.id === columnId);
  if (!column) {
    throw new ApplicationError({
      code: ErrorCode.ENTITY_NOT_FOUND,
      params: { entityType: 'column', entityId: columnId.toString() },
    });
  }
  return column;
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
    return fields.map((field) => toTableColumn(field));
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

  async createRows(
    projectId: string,
    tableId: number,
    request: CreateTableRowsRequestBody,
  ): Promise<TableRowsWriteResult> {
    await assertWritableColumns(projectId, tableId, request.rows);
    const tokenOrResolver = await getTokenResolver(projectId);
    try {
      const chunks = await batchCreateRows({
        tableId,
        tokenOrResolver,
        items: request.rows,
      });
      return {
        rows: flattenBatchResults(chunks).map((row, index) =>
          pickWrittenColumns(row, request.rows[index] ?? {}),
        ),
      };
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },

  async updateRows(
    projectId: string,
    tableId: number,
    request: UpdateTableRowsRequestBody,
  ): Promise<TableRowsWriteResult> {
    await assertWritableColumns(
      projectId,
      tableId,
      request.rows.map((row) => row.fields),
    );
    const tokenOrResolver = await getTokenResolver(projectId);
    try {
      const chunks = await batchUpdateRows({
        tableId,
        tokenOrResolver,
        items: request.rows.map((row) => ({
          rowId: row.id,
          fields: row.fields,
        })),
      });
      const writtenById = new Map(
        request.rows.map((row) => [row.id, row.fields]),
      );
      return {
        rows: flattenBatchResults(chunks).map((row) =>
          pickWrittenColumns(row, writtenById.get(Number(row['id'])) ?? {}),
        ),
      };
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },

  async deleteRows(
    projectId: string,
    tableId: number,
    rowIds: number[],
  ): Promise<TableRowsDeleteResult> {
    // Ownership check only; no columns involved.
    await tablesService.listTableColumns(projectId, tableId);
    const tokenOrResolver = await getTokenResolver(projectId);
    try {
      await batchDeleteRows({ tableId, tokenOrResolver, rowIds });
      return { deleted: rowIds.length };
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },

  async createTable(
    projectId: string,
    request: CreateTableRequestBody,
  ): Promise<TableDetails> {
    assertRowsMatchHeader(request.data);
    const project = await projectService.getOneOrThrow(projectId);
    let tableId: number;
    try {
      const table = await createTable(
        {
          tablesDatabaseId: project.tablesDatabaseId,
          tablesDatabaseToken: project.tablesDatabaseToken,
        },
        request.name,
        request.data,
      );
      tableId = table.id;
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
    return tablesService.getTable(projectId, tableId);
  },

  async addColumn(
    projectId: string,
    tableId: number,
    request: AddTableColumnRequestBody,
  ): Promise<TableColumn> {
    assertOptionsMatchType(request.type, request);
    // Ownership check only.
    await tablesService.listTableColumns(projectId, tableId);
    const tokenOrResolver = await getTokenResolver(projectId);
    try {
      const field = await makeOpenOpsTablesPost<BaserowField>(
        `api/database/fields/table/${tableId}/`,
        toBaserowFieldBody(request),
        createAxiosHeaders(tokenOrResolver),
      );
      return toTableColumn(field);
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },

  async updateColumn(
    projectId: string,
    tableId: number,
    columnId: number,
    request: UpdateTableColumnRequestBody,
  ): Promise<TableColumn> {
    const column = await getColumnOrThrow(projectId, tableId, columnId);
    assertOptionsMatchType(request.type ?? column.type, request);
    const tokenOrResolver = await getTokenResolver(projectId);

    // Get Table Columns leaves out option colors, which Baserow requires on every option.
    let existingOptions: SelectOpenOpsField['select_options'] | undefined;
    if (request.selectOptions !== undefined) {
      const fields = await getFields(tableId, tokenOrResolver);
      const field = fields.find((f) => f.id === columnId) as
        SelectOpenOpsField | undefined;
      existingOptions = field?.select_options;
    }

    try {
      const field = await makeOpenOpsTablesPatch<BaserowField>(
        `api/database/fields/${columnId}/`,
        toBaserowFieldBody(request, existingOptions),
        createAxiosHeaders(tokenOrResolver),
      );
      return toTableColumn(field);
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },

  async deleteColumn(
    projectId: string,
    tableId: number,
    columnId: number,
  ): Promise<TableColumnDeleteResult> {
    const column = await getColumnOrThrow(projectId, tableId, columnId);
    if (column.primary) {
      throwValidationError('The primary column cannot be deleted');
    }
    const tokenOrResolver = await getTokenResolver(projectId);
    try {
      await makeOpenOpsTablesDelete<unknown>(
        `api/database/fields/${columnId}/`,
        createAxiosHeaders(tokenOrResolver),
      );
      return { id: columnId };
    } catch (error) {
      return rethrowBaserowClientError(error);
    }
  },
};
