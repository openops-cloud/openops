import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  Permission,
  PrincipalType,
  QueryTableRowsRequest,
  SERVICE_KEY_SECURITY_OPENAPI,
  TableColumn,
  TableItem,
  TableRowFilterOperator,
  TableRowsPage,
} from '@openops/shared';
import { StatusCodes } from 'http-status-codes';
import { getProjectScopedRoutePolicy } from '../core/security/route-policies/route-security-policy-factory';
import { tablesService } from './tables.service';

const security = getProjectScopedRoutePolicy({
  allowedPrincipals: [PrincipalType.USER, PrincipalType.SERVICE],
  permission: Permission.WRITE_TABLE,
});

const TableIdParams = Type.Object({
  id: Type.Integer({ description: 'Table id, as returned by List Tables.' }),
});

const ListTablesRequest = {
  config: { security },
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

const GetTableColumnsRequest = {
  config: { security },
  schema: {
    operationId: 'Get Table Columns',
    tags: ['tables'],
    description:
      'Get the columns of a table: id, name, type, whether it is the primary column, ' +
      'and whether it is read-only. Use the returned names as fieldName values when ' +
      'filtering rows. Column types (text, number, date, boolean, single_select, ...) ' +
      'determine which filter operators are valid.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    response: {
      [StatusCodes.OK]: Type.Array(TableColumn),
    },
  },
};

const QueryTableRowsRequestOptions = {
  config: { security },
  schema: {
    operationId: 'Query Table Rows',
    tags: ['tables'],
    description:
      'Read rows from a table, one page at a time. Filter by column with structured ' +
      'operators, or search free text across all columns, or both. ' +
      `Operators: ${Object.values(TableRowFilterOperator).join(', ')}. ` +
      'Each filter names a column (use Get Table Columns to learn the exact names), an ' +
      'operator and usually a value; empty and not_empty take no value. When more than ' +
      'one filter is given, filterCombinator (AND or OR) is required. Results are ' +
      'keyed by column name. Use page and size to paginate; count is the total number ' +
      'of matching rows and hasMore tells you whether another page exists.',
    security: [SERVICE_KEY_SECURITY_OPENAPI],
    params: TableIdParams,
    body: QueryTableRowsRequest,
    response: {
      [StatusCodes.OK]: TableRowsPage,
    },
  },
};

export const tablesController: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/', ListTablesRequest, async (request) => {
    return tablesService.listTables(request.principal.projectId);
  });

  app.get('/:id/columns', GetTableColumnsRequest, async (request) => {
    return tablesService.listTableColumns(
      request.principal.projectId,
      request.params.id,
    );
  });

  app.post('/:id/rows/query', QueryTableRowsRequestOptions, async (request) => {
    return tablesService.queryTableRows(
      request.principal.projectId,
      request.params.id,
      request.body,
    );
  });
};
