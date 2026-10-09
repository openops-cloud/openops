/* eslint-disable @typescript-eslint/no-explicit-any */
const mockTablesService = {
  listTables: jest.fn(),
  getTable: jest.fn(),
  listTableColumns: jest.fn(),
  queryTableRows: jest.fn(),
};

jest.mock('../../../src/app/tables/tables.service', () => ({
  tablesService: mockTablesService,
}));

import {
  ApplicationError,
  ErrorCode,
  PrincipalType,
  TableRowFilterCombinator,
  TableRowFilterOperator,
} from '@openops/shared';
import Fastify, { FastifyInstance } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { errorHandler } from '../../../src/app/helper/error-handler';
import { tablesController } from '../../../src/app/tables/tables.controller';

const projectId = 'proj12345678901234567';

async function buildApp(
  principalType: PrincipalType,
): Promise<FastifyInstance> {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.decorateRequest('principal', null as any);
  app.addHook('onRequest', async (request: any) => {
    request.principal = {
      id: 'user12345678901234567',
      type: principalType,
      projectId,
      organization: { id: 'org123456789012345678' },
    };
  });
  await app.register(tablesController, { prefix: '/v1/tables' });
  return app;
}

describe('tablesController', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp(PrincipalType.USER);
  });

  afterEach(async () => app.close());

  describe('GET /v1/tables', () => {
    it('returns the tables of the principal project', async () => {
      const tables = [
        { id: 1, name: 'Cost Data' },
        { id: 2, name: 'Owners Lookup' },
      ];
      mockTablesService.listTables.mockResolvedValue(tables);

      const response = await app.inject({ method: 'GET', url: '/v1/tables' });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(tables);
      expect(mockTablesService.listTables).toHaveBeenCalledWith(projectId);
    });

    it('serves a SERVICE principal (an OAuth agent) the same way as a user', async () => {
      await app.close();
      app = await buildApp(PrincipalType.SERVICE);
      mockTablesService.listTables.mockResolvedValue([]);

      const response = await app.inject({ method: 'GET', url: '/v1/tables' });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.listTables).toHaveBeenCalledWith(projectId);
    });

    it('returns 500 when the service throws', async () => {
      mockTablesService.listTables.mockRejectedValue(new Error('down'));

      const response = await app.inject({ method: 'GET', url: '/v1/tables' });

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    });
  });

  describe('GET /v1/tables/:id', () => {
    it('returns the table details', async () => {
      const details = { id: 42, name: 'Owners', url: 'http://ui/tables?x' };
      mockTablesService.getTable.mockResolvedValue(details);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/tables/42',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(details);
      expect(mockTablesService.getTable).toHaveBeenCalledWith(projectId, 42);
    });

    it('returns 404 when the table is not in the project', async () => {
      mockTablesService.getTable.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'table', entityId: '999' },
        }),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/v1/tables/999',
      });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('GET /v1/tables/:id/columns', () => {
    it('returns the columns and passes the id as a number', async () => {
      const columns = [
        {
          id: 101,
          name: 'Tag Value',
          type: 'text',
          primary: true,
          readOnly: false,
        },
      ];
      mockTablesService.listTableColumns.mockResolvedValue(columns);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/tables/42/columns',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(columns);
      expect(mockTablesService.listTableColumns).toHaveBeenCalledWith(
        projectId,
        42,
      );
    });

    it('rejects a non-numeric table id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/tables/not-a-number/columns',
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.listTableColumns).not.toHaveBeenCalled();
    });

    it('returns 404 when the table is not in the project', async () => {
      mockTablesService.listTableColumns.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'table', entityId: '999' },
        }),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/v1/tables/999/columns',
      });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('POST /v1/tables/:id/rows/query', () => {
    const page = {
      count: 1,
      page: 1,
      size: 100,
      hasMore: false,
      data: [{ id: 1, Name: 'x' }],
    };

    it('forwards the structured query to the service', async () => {
      mockTablesService.queryTableRows.mockResolvedValue(page);
      const body = {
        filters: [
          {
            fieldName: 'Status',
            operator: TableRowFilterOperator.EQUAL,
            value: 'open',
          },
          { fieldName: 'Owner', operator: TableRowFilterOperator.NOT_EMPTY },
        ],
        filterCombinator: TableRowFilterCombinator.AND,
        search: 'prod',
        page: 2,
        size: 50,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: body,
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(page);
      expect(mockTablesService.queryTableRows).toHaveBeenCalledWith(
        projectId,
        42,
        body,
      );
    });

    it('fills in the first page and default size for an empty body', async () => {
      mockTablesService.queryTableRows.mockResolvedValue(page);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: {},
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.queryTableRows).toHaveBeenCalledWith(
        projectId,
        42,
        { page: 1, size: 100 },
      );
    });

    // MCP clients send no body (or JSON null) when the agent passes only the table id.
    it.each([
      ['no body', {}],
      [
        'a JSON null body',
        { payload: 'null', headers: { 'content-type': 'application/json' } },
      ],
    ])('treats %s like an empty body', async (_label, request) => {
      mockTablesService.queryTableRows.mockResolvedValue(page);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        ...request,
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.queryTableRows).toHaveBeenCalledWith(
        projectId,
        42,
        { page: 1, size: 100 },
      );
    });

    it('forwards sort order and column selection', async () => {
      mockTablesService.queryTableRows.mockResolvedValue(page);
      const body = {
        orderBy: [{ fieldName: 'Cost', direction: 'desc' }],
        columns: ['Name', 'Cost'],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: body,
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.queryTableRows).toHaveBeenCalledWith(
        projectId,
        42,
        { ...body, page: 1, size: 100 },
      );
    });

    it('rejects an unknown sort direction at the schema', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: { orderBy: [{ fieldName: 'Cost', direction: 'down' }] },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.queryTableRows).not.toHaveBeenCalled();
    });

    it('rejects an unknown filter operator before reaching the service', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: {
          filters: [{ fieldName: 'Status', operator: 'like', value: 'x' }],
        },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.queryTableRows).not.toHaveBeenCalled();
    });

    it('rejects an object as a filter value, which Baserow would match as a string', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: {
          filters: [
            { fieldName: 'Value', operator: 'equal', value: { gte: 5 } },
          ],
        },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.queryTableRows).not.toHaveBeenCalled();
    });

    it('accepts a list value for the any-of operators', async () => {
      mockTablesService.queryTableRows.mockResolvedValue(page);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: {
          filters: [
            {
              fieldName: 'Status',
              operator: 'single_select_is_any_of',
              value: ['open', 'snoozed'],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
    });

    it('rejects a page size above the cap', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: { size: 201 },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.queryTableRows).not.toHaveBeenCalled();
    });

    // ErrorCode.VALIDATION is mapped to 409 by the shared error handler.
    it('surfaces a validation error from the service as a client error', async () => {
      mockTablesService.queryTableRows.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.VALIDATION,
          params: { message: 'filterCombinator is required' },
        }),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows/query',
        payload: {},
      });

      expect(response.statusCode).toBe(StatusCodes.CONFLICT);
      expect(response.json()).toMatchObject({ code: ErrorCode.VALIDATION });
    });
  });
});
