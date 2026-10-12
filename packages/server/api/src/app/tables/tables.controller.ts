import {
  FastifyPluginCallbackTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  Permission,
  PrincipalType,
  QueryTableRowsRequestBody,
  SERVICE_KEY_SECURITY_OPENAPI,
  TableColumn,
  TableDetails,
  TableItem,
  TableRowFilterOperator,
  TableRowsPage,
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

  done();
};

// WRITE_TABLE is the only Tables permission and already gates the Tables UI for every
// role, so it guards these read-only routes as well. SERVICE covers OAuth agents.
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
