const mockProjectRepo = {
  findOneByOrFail: jest.fn(),
};

const mockGetAllTables = jest.fn();
const mockResolveTokenProvider = jest.fn();
const mockGetFields = jest.fn();
const mockGetRowsPage = jest.fn();

jest.mock('../../../src/app/project/project-service', () => ({
  projectRepo: () => mockProjectRepo,
}));

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  getAllTablesInDatabase: (...args: unknown[]) => mockGetAllTables(...args),
  resolveTokenProvider: (...args: unknown[]) =>
    mockResolveTokenProvider(...args),
  getFields: (...args: unknown[]) => mockGetFields(...args),
  getRowsPage: (...args: unknown[]) => mockGetRowsPage(...args),
}));

import { FilterType, ViewFilterTypesEnum } from '@openops/common';
import {
  ErrorCode,
  TableRowFilterCombinator,
  TableRowFilterOperator,
} from '@openops/shared';
import { tablesService } from '../../../src/app/tables/tables.service';

const projectId = 'proj12345678901234567';
const project = {
  id: projectId,
  tablesDatabaseId: 100,
  tablesDatabaseToken: { iv: 'iv', data: 'encrypted' },
};
const context = {
  tablesDatabaseId: 100,
  tablesDatabaseToken: project.tablesDatabaseToken,
};
const tokenResolver = { getToken: () => 'db-token' };

describe('tablesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectRepo.findOneByOrFail.mockResolvedValue(project);
    mockResolveTokenProvider.mockResolvedValue(tokenResolver);
    mockGetAllTables.mockResolvedValue([
      { id: 1, name: 'Cost Data', order: 5 },
      { id: 2, name: 'Owners', order: 3 },
    ]);
  });

  describe('listTables', () => {
    it('lists same-named tables separately, since callers address them by id', async () => {
      mockGetAllTables.mockResolvedValue([
        { id: 5, name: 'Opportunities', order: 1 },
        { id: 9, name: 'Opportunities', order: 2 },
      ]);

      const result = await tablesService.listTables(projectId);

      expect(result).toEqual([
        { id: 5, name: 'Opportunities' },
        { id: 9, name: 'Opportunities' },
      ]);
    });

    it('returns id and name only, scoped to the project database', async () => {
      const result = await tablesService.listTables(projectId);

      expect(result).toEqual([
        { id: 1, name: 'Cost Data' },
        { id: 2, name: 'Owners' },
      ]);
      expect(mockProjectRepo.findOneByOrFail).toHaveBeenCalledWith({
        id: projectId,
      });
      expect(mockGetAllTables).toHaveBeenCalledWith(context);
    });
  });

  describe('listTableColumns', () => {
    it('maps Baserow fields to columns', async () => {
      mockGetFields.mockResolvedValue([
        { id: 11, name: 'Name', type: 'text', primary: true, read_only: false },
        {
          id: 12,
          name: 'Created',
          type: 'created_on',
          primary: false,
          read_only: true,
        },
      ]);

      const result = await tablesService.listTableColumns(projectId, 1);

      expect(result).toEqual([
        { id: 11, name: 'Name', type: 'text', primary: true, readOnly: false },
        {
          id: 12,
          name: 'Created',
          type: 'created_on',
          primary: false,
          readOnly: true,
        },
      ]);
      expect(mockGetFields).toHaveBeenCalledWith(1, tokenResolver);
    });

    it('refuses a table that is not in the project database', async () => {
      await expect(
        tablesService.listTableColumns(projectId, 999),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'table', entityId: '999' },
        },
      });

      expect(mockGetFields).not.toHaveBeenCalled();
    });
  });

  describe('queryTableRows', () => {
    const page = { count: 1, hasMore: false, results: [{ id: 1 }] };

    beforeEach(() => {
      mockGetFields.mockResolvedValue([
        { id: 11, name: 'Status', type: 'text' },
        { id: 12, name: 'Due', type: 'date' },
      ]);
    });

    it('translates operators to Baserow filter types and forwards paging', async () => {
      mockGetRowsPage.mockResolvedValue(page);

      const result = await tablesService.queryTableRows(projectId, 1, {
        filters: [
          {
            fieldName: 'Status',
            operator: TableRowFilterOperator.equal,
            value: 'open',
          },
          {
            fieldName: 'Due',
            operator: TableRowFilterOperator.date_before,
            value: '2026-01-01',
          },
        ],
        filterCombinator: TableRowFilterCombinator.OR,
        search: 'prod',
        page: 2,
        size: 25,
      });

      expect(result).toBe(page);
      expect(mockGetRowsPage).toHaveBeenCalledWith({
        tableId: 1,
        tokenOrResolver: tokenResolver,
        filters: [
          {
            fieldName: 'Status',
            type: ViewFilterTypesEnum.equal,
            value: 'open',
          },
          {
            fieldName: 'Due',
            type: ViewFilterTypesEnum.date_before,
            value: '2026-01-01',
          },
        ],
        filterType: FilterType.OR,
        search: 'prod',
        page: 2,
        size: 25,
      });
    });

    it('works with no filters at all, without looking up columns', async () => {
      mockGetRowsPage.mockResolvedValue(page);

      await tablesService.queryTableRows(projectId, 1, {});

      expect(mockGetRowsPage).toHaveBeenCalledWith(
        expect.objectContaining({ tableId: 1, filters: [] }),
      );
      expect(mockGetFields).not.toHaveBeenCalled();
    });

    it('rejects a filter on a column the table does not have, naming the real ones', async () => {
      await expect(
        tablesService.queryTableRows(projectId, 1, {
          filters: [
            {
              fieldName: 'Stauts',
              operator: TableRowFilterOperator.equal,
              value: 'open',
            },
          ],
        }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: {
            message: expect.stringContaining('Unknown column(s): Stauts'),
          },
        },
      });

      expect(mockGetRowsPage).not.toHaveBeenCalled();
    });

    it('rejects several filters without a combinator before touching Tables', async () => {
      await expect(
        tablesService.queryTableRows(projectId, 1, {
          filters: [
            {
              fieldName: 'A',
              operator: TableRowFilterOperator.equal,
              value: 1,
            },
            {
              fieldName: 'B',
              operator: TableRowFilterOperator.equal,
              value: 2,
            },
          ],
        }),
      ).rejects.toMatchObject({
        error: { code: ErrorCode.VALIDATION },
      });

      expect(mockGetAllTables).not.toHaveBeenCalled();
      expect(mockGetRowsPage).not.toHaveBeenCalled();
    });

    it('turns a Baserow client error into a validation error the agent can act on', async () => {
      mockGetRowsPage.mockRejectedValue(
        new Error(
          JSON.stringify({
            error: 'ERROR_INVALID_PAGE',
            detail: 'The requested page is out of range.',
          }),
        ),
      );

      await expect(
        tablesService.queryTableRows(projectId, 1, { page: 99 }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: {
            message: 'ERROR_INVALID_PAGE: The requested page is out of range.',
          },
        },
      });
    });

    it('leaves non-Baserow failures untouched', async () => {
      mockGetRowsPage.mockRejectedValue(new Error('socket hang up'));

      await expect(
        tablesService.queryTableRows(projectId, 1, {}),
      ).rejects.toThrow('socket hang up');
    });

    it('refuses a table that is not in the project database', async () => {
      await expect(
        tablesService.queryTableRows(projectId, 999, {}),
      ).rejects.toMatchObject({
        error: { code: ErrorCode.ENTITY_NOT_FOUND },
      });

      expect(mockGetRowsPage).not.toHaveBeenCalled();
    });
  });
});
