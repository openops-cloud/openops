import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  AddTableColumnRequestBody,
  CreateTableRequestBody,
  CreateTableRowsRequestBody,
  DeleteTableRowsQuery,
  MAX_TABLE_ROWS_PER_WRITE,
  Permission,
  PrincipalType,
  QueryTableRowsRequestBody,
  SERVICE_KEY_SECURITY_OPENAPI,
  TableColumn,
  TableColumnDeleteResult,
  TableDetails,
  TableItem,
  TableRowFilterOperator,
  TableRowsDeleteResult,
  TableRowsPage,
  TableRowsWriteResult,
  UpdateTableColumnRequestBody,
  UpdateTableRowsRequestBody,
} from '@openops/shared';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { tablesService } from './tables.service';

export const tablesController: FastifyPluginCallbackTypebox = (
  app,
  _opts,
  done,
) => {
  app.get('/', ListTablesRequest, async (request) => {
    return tablesService.listTables(request.principal.projectId);
  });

  app.get('/:id', GetTableRequest, async (request) => {
    return tablesService.getTable(
      request.principal.projectId,
      request.params.id,
    );
  });

  app.get('/:id/columns', GetTableColumnsRequest, async (request) => {
    return tablesService.listTableColumns(
      request.principal.projectId,
      request.params.id,
    );
  });

  app.post('/:id/rows/query', QueryTableRowsRequest, async (request) => {
    return tablesService.queryTableRows(
      request.principal.projectId,
      request.params.id,
      request.body,
    );
  });

  app.post('/:id/rows', CreateTableRowsRequest, async (request) => {
    return tablesService.createRows(
      request.principal.projectId,
      request.params.id,
      request.body,
    );
  });

  app.patch('/:id/rows', UpdateTableRowsRequest, async (request) => {
    return tablesService.updateRows(
      request.principal.projectId,
      request.params.id,
      request.body,
    );
  });

  app.delete('/:id/rows', DeleteTableRowsRequest, async (request) => {
    return tablesService.deleteRows(
      request.principal.projectId,
      request.params.id,
      request.query.ids,
    );
  });

  app.post('/', CreateTableRequest, async (request) => {
    return tablesService.createTable(request.principal.projectId, request.body);
  });

  app.post('/:id/columns', AddTableColumnRequest, async (request) => {
    return tablesService.addColumn(
      request.principal.projectId,
      request.params.id,
      request.body,
    );
  });

  app.patch(
    '/:id/columns/:columnId',
    UpdateTableColumnRequest,
    async (request) => {
      return tablesService.updateColumn(
        request.principal.projectId,
        request.params.id,
        request.params.columnId,
        request.body,
      );
    },
  );

  app.delete(
    '/:id/columns/:columnId',
    DeleteTableColumnRequest,
    async (request) => {
      return tablesService.deleteColumn(
        request.principal.projectId,
        request.params.id,
        request.params.columnId,
      );
    },
  );

  done();
};

// WRITE_TABLE is the only Tables permission and already gates the Tables UI for every
// role, so it guards the read routes as well as the writes. SERVICE covers OAuth agents.
const tablesRoutePolicy = getProjectScopedRoutePolicy({
  allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  permission: Permission.WRITE_TABLE,
});

const TableIdParams = Type.Object({
  id: Type.Integer({ description: 'Table id, as returned by List Tables.' }),
});

const ListTablesRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'List Tables',
    tags: ['tables'],
    description:
      'List the OpenOps Tables available in the current project, with their ids and ' +
      'names. Call this first: every other Tables operation takes a table id from here. ' +
      'Tables hold structured FinOps data such as resource owners, opportunities, ' +
      'budgets and tag mappings.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    response: {
      [StatusCodes.OK]: Type.Array(TableItem),
    },
  },
};

const GetTableRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Get Table',
    tags: ['tables'],
    description:
      'Get one table by id: its name and a link to open it in the OpenOps UI. Use it to ' +
      'confirm a table id or to give a user a link. Columns come from Get Table Columns.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    response: {
      [StatusCodes.OK]: TableDetails,
    },
  },
};

const GetTableColumnsRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Get Table Columns',
    tags: ['tables'],
    description:
      'Get the columns of a table: id, name, type, whether it is the primary column, ' +
      'whether it is read-only, and for select columns the allowed options. Use the ' +
      'returned names as fieldName values when filtering or sorting rows. Column types ' +
      '(text, number, date, boolean, single_select, ...) determine which filter ' +
      'operators are valid.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    response: {
      [StatusCodes.OK]: Type.Array(TableColumn),
    },
  },
};

const QueryTableRowsRequest = {
  config: { security: tablesRoutePolicy },
  // Every field is optional, and MCP clients send no body (or JSON null) when the agent
  // passes only the table id. Treat that as {} so the schema defaults still apply.
  preValidation: async (request: FastifyRequest): Promise<void> => {
    request.body ??= {};
  },
  schema: {
    operationId: 'Query Table Rows',
    tags: ['tables'],
    description:
      'Read rows from a table, one page at a time. Filter by column with structured ' +
      'operators, or search free text across all columns, or both. ' +
      `Operators: ${Object.values(TableRowFilterOperator).join(', ')}. ` +
      'Each filter names a column (use Get Table Columns to learn the exact names), an ' +
      'operator and usually a value; empty and not_empty take no value. When more than ' +
      'one filter is given, filterCombinator (AND or OR) is required. Sort with ' +
      'orderBy (column name plus asc or desc, applied in sequence). Use columns to ' +
      'return only the columns you need. Rows in data are keyed by column name. Use ' +
      'page and size to paginate; the response echoes the page and size applied, count ' +
      'is the total number of matching rows and hasMore tells you whether another page ' +
      'exists.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    body: QueryTableRowsRequestBody,
    response: {
      [StatusCodes.OK]: TableRowsPage,
    },
  },
};

const CreateTableRowsRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Create Table Rows',
    tags: ['tables'],
    description:
      'Add rows to a table. Each row is an object keyed by column name; call Get Table ' +
      'Columns first to learn the names and types. Read-only columns (ids, created/modified ' +
      'times, formulas) cannot be set. Single-select cells take the option label. ' +
      `At most ${MAX_TABLE_ROWS_PER_WRITE} rows per call. All rows succeed or none do. ` +
      "Returns each row's id plus the columns you set. Number cells come back as strings " +
      '(e.g. "120.50"). Send null to clear a cell; an empty string is stored as-is.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    body: CreateTableRowsRequestBody,
    response: {
      [StatusCodes.OK]: TableRowsWriteResult,
    },
  },
};

const UpdateTableRowsRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Update Table Rows',
    tags: ['tables'],
    description:
      'Update existing rows by row id (the id field returned by Query Table Rows). Only the ' +
      'columns given in fields change; others keep their values. Read-only columns cannot ' +
      `be set. At most ${MAX_TABLE_ROWS_PER_WRITE} rows per call. All rows succeed or none ` +
      "do. Returns each row's id plus the columns you set. Number cells come back as " +
      'strings (e.g. "120.50"). Send null to clear a cell; an empty string is stored as-is.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    body: UpdateTableRowsRequestBody,
    response: {
      [StatusCodes.OK]: TableRowsWriteResult,
    },
  },
};

const DeleteTableRowsRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Delete Table Rows',
    tags: ['tables'],
    description:
      'Delete rows by row id (from Query Table Rows). ' +
      `At most ${MAX_TABLE_ROWS_PER_WRITE} ids per call. All ids must exist or nothing ` +
      'is deleted. This cannot be undone.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    querystring: DeleteTableRowsQuery,
    response: {
      [StatusCodes.OK]: TableRowsDeleteResult,
    },
  },
};

const TableColumnParams = Type.Object({
  id: Type.Integer({ description: 'Table id, as returned by List Tables.' }),
  columnId: Type.Integer({
    description: 'Column id, as returned by Get Table Columns.',
  }),
});

const COLUMN_TYPES_HELP =
  'Supported types: text, long_text, number, boolean, date, single_select, ' +
  'multiple_select, url, email. selectOptions applies to the select types, ' +
  'decimalPlaces to number, includeTime to date.';

const CreateTableRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Create Table',
    tags: ['tables'],
    description:
      'Create a table. data is a list of rows: the first row is the column names and ' +
      `any further rows (at most ${MAX_TABLE_ROWS_PER_WRITE}) are starting rows. All ` +
      'columns start as text and the first is the primary column; use Update Table ' +
      'Column to change types. Names need not be unique, but workflow blocks find ' +
      'tables by name and use the oldest one, so give a table that workflows will use a ' +
      'name not already in List Tables. Returns the new table id and a link to open it.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    body: CreateTableRequestBody,
    response: {
      [StatusCodes.OK]: TableDetails,
    },
  },
};

const AddTableColumnRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Add Table Column',
    tags: ['tables'],
    description:
      'Add a column to a table. Column names must be unique within the table. ' +
      `${COLUMN_TYPES_HELP} Returns the column as Get Table Columns does.`,
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    body: AddTableColumnRequestBody,
    response: {
      [StatusCodes.OK]: TableColumn,
    },
  },
};

const UpdateTableColumnRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Update Table Column',
    tags: ['tables'],
    description:
      'Rename a column, change its type, or change its type options. Only the given ' +
      'properties change. Changing the type converts existing cell values and may ' +
      `clear the ones that do not fit. ${COLUMN_TYPES_HELP} Returns the updated column.`,
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableColumnParams,
    body: UpdateTableColumnRequestBody,
    response: {
      [StatusCodes.OK]: TableColumn,
    },
  },
};

const DeleteTableColumnRequest = {
  config: { security: tablesRoutePolicy },
  schema: {
    operationId: 'Delete Table Column',
    tags: ['tables'],
    description:
      'Delete a column and its values. The primary column cannot be deleted. A user ' +
      'can restore the column from the Tables trash.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableColumnParams,
    response: {
      [StatusCodes.OK]: TableColumnDeleteResult,
    },
  },
};
