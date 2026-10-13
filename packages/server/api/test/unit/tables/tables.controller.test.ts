/* eslint-disable @typescript-eslint/no-explicit-any */
const mockTablesService = {
  listTables: jest.fn(),
  getTable: jest.fn(),
  listTableColumns: jest.fn(),
  queryTableRows: jest.fn(),
  createRows: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  createTable: jest.fn(),
  addColumn: jest.fn(),
  updateColumn: jest.fn(),
  deleteColumn: jest.fn(),
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

describe('tablesController (row writes)', () => {
  let app: FastifyInstance;
  const written = { rows: [{ id: 1, Name: 'a' }] };

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp(PrincipalType.USER);
  });

  afterEach(async () => app.close());

  describe('POST /v1/tables/:id/rows', () => {
    it('creates rows keyed by column name', async () => {
      mockTablesService.createRows.mockResolvedValue(written);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows',
        payload: { rows: [{ Name: 'a', Owner: 'x' }] },
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(written);
      expect(mockTablesService.createRows).toHaveBeenCalledWith(projectId, 42, {
        rows: [{ Name: 'a', Owner: 'x' }],
      });
    });

    it('serves a SERVICE principal (an OAuth agent) the same way as a user', async () => {
      await app.close();
      app = await buildApp(PrincipalType.SERVICE);
      mockTablesService.createRows.mockResolvedValue(written);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows',
        payload: { rows: [{ Name: 'a' }] },
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
    });

    it('rejects an empty row list and more than 200 rows at the schema', async () => {
      for (const rows of [
        [],
        Array.from({ length: 201 }, () => ({ Name: 'a' })),
      ]) {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/tables/42/rows',
          payload: { rows },
        });

        expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      }
      expect(mockTablesService.createRows).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric table id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/abc/rows',
        payload: { rows: [{ Name: 'a' }] },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });

    it('passes validation errors from the service through as client errors', async () => {
      mockTablesService.createRows.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.VALIDATION,
          params: { message: 'Unknown column(s): Nmae' },
        }),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/42/rows',
        payload: { rows: [{ Nmae: 'a' }] },
      });

      // ErrorCode.VALIDATION is mapped to 409 by the shared error handler.
      expect(response.statusCode).toBe(StatusCodes.CONFLICT);
      expect(response.json()).toMatchObject({ code: ErrorCode.VALIDATION });
    });
  });

  describe('PATCH /v1/tables/:id/rows', () => {
    it('updates rows by id', async () => {
      mockTablesService.updateRows.mockResolvedValue(written);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/tables/42/rows',
        payload: { rows: [{ id: 7, fields: { Owner: 'y' } }] },
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.updateRows).toHaveBeenCalledWith(projectId, 42, {
        rows: [{ id: 7, fields: { Owner: 'y' } }],
      });
    });

    it('requires an integer id on every row', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/tables/42/rows',
        payload: { rows: [{ fields: { Owner: 'y' } }] },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.updateRows).not.toHaveBeenCalled();
    });

    it('returns 404 when the table is not in the project', async () => {
      mockTablesService.updateRows.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'table', entityId: '999' },
        }),
      );

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/tables/999/rows',
        payload: { rows: [{ id: 1, fields: { Owner: 'y' } }] },
      });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('DELETE /v1/tables/:id/rows', () => {
    it('deletes the ids given as repeated query parameters', async () => {
      mockTablesService.deleteRows.mockResolvedValue({ deleted: 2 });

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/tables/42/rows?ids=3&ids=5',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual({ deleted: 2 });
      expect(mockTablesService.deleteRows).toHaveBeenCalledWith(
        projectId,
        42,
        [3, 5],
      );
    });

    it('accepts a single id', async () => {
      mockTablesService.deleteRows.mockResolvedValue({ deleted: 1 });

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/tables/42/rows?ids=3',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.deleteRows).toHaveBeenCalledWith(
        projectId,
        42,
        [3],
      );
    });

    it('rejects a call without ids', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/tables/42/rows',
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.deleteRows).not.toHaveBeenCalled();
    });
  });
});

describe('tablesController (schema writes)', () => {
  let app: FastifyInstance;
  const column = {
    id: 9,
    name: 'Tier',
    type: 'text',
    primary: false,
    readOnly: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp(PrincipalType.SERVICE);
  });

  afterEach(async () => app.close());

  describe('POST /v1/tables', () => {
    it('creates a table from a name and a header row with starting rows', async () => {
      const details = { id: 77, name: 'Idle VMs', url: 'http://ui/t/77' };
      mockTablesService.createTable.mockResolvedValue(details);
      const payload = {
        name: 'Idle VMs',
        data: [
          ['VM', 'Region'],
          ['vm-1', 'eu-west-1'],
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables',
        payload,
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(details);
      expect(mockTablesService.createTable).toHaveBeenCalledWith(
        projectId,
        payload,
      );
    });

    it('requires data, a non-empty header and at most 200 starting rows', async () => {
      for (const payload of [
        { name: 'T' },
        { name: 'T', data: [] },
        { name: 'T', data: [[]] },
        { name: '', data: [['A']] },
        {
          name: 'T',
          data: [['A'], ...Array.from({ length: 201 }, () => ['x'])],
        },
      ]) {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/tables',
          payload,
        });
        expect({ payload, status: response.statusCode }).toEqual({
          payload,
          status: StatusCodes.BAD_REQUEST,
        });
      }
      expect(mockTablesService.createTable).not.toHaveBeenCalled();
    });
  });

  describe('POST /v1/tables/:id/columns', () => {
    it('adds a column', async () => {
      mockTablesService.addColumn.mockResolvedValue(column);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/5/columns',
        payload: { name: 'Tier', type: 'text' },
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual(column);
      expect(mockTablesService.addColumn).toHaveBeenCalledWith(projectId, 5, {
        name: 'Tier',
        type: 'text',
      });
    });

    it('rejects a type outside the supported set', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tables/5/columns',
        payload: { name: 'L', type: 'link_row' },
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(mockTablesService.addColumn).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /v1/tables/:id/columns/:columnId', () => {
    it('updates a column', async () => {
      mockTablesService.updateColumn.mockResolvedValue(column);

      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/tables/5/columns/9',
        payload: { name: 'Tier' },
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(mockTablesService.updateColumn).toHaveBeenCalledWith(
        projectId,
        5,
        9,
        { name: 'Tier' },
      );
    });

    it('rejects an empty update', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/tables/5/columns/9',
        payload: {},
      });

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
    });
  });

  describe('DELETE /v1/tables/:id/columns/:columnId', () => {
    it('deletes a column', async () => {
      mockTablesService.deleteColumn.mockResolvedValue({ id: 9 });

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/tables/5/columns/9',
      });

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.json()).toEqual({ id: 9 });
      expect(mockTablesService.deleteColumn).toHaveBeenCalledWith(
        projectId,
        5,
        9,
      );
    });

    it('passes a not-found from the service through as 404', async () => {
      mockTablesService.deleteColumn.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'column', entityId: '9' },
        }),
      );

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/tables/5/columns/9',
      });

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });
});
