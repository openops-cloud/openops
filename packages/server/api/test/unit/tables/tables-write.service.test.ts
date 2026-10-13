const mockProjectService = { getOneOrThrow: jest.fn() };
const mockCreateTable = jest.fn();
const mockResolveTokenProvider = jest.fn();
const mockBatchCreateRows = jest.fn();
const mockBatchUpdateRows = jest.fn();
const mockBatchDeleteRows = jest.fn();
const mockGetFields = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: mockProjectService,
}));

jest.mock('../../../src/app/openops-tables/create-table', () => ({
  createTable: (...args: unknown[]) => mockCreateTable(...args),
}));

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  resolveTokenProvider: (...args: unknown[]) =>
    mockResolveTokenProvider(...args),
  batchCreateRows: (...args: unknown[]) => mockBatchCreateRows(...args),
  batchUpdateRows: (...args: unknown[]) => mockBatchUpdateRows(...args),
  batchDeleteRows: (...args: unknown[]) => mockBatchDeleteRows(...args),
  getFields: (...args: unknown[]) => mockGetFields(...args),
  makeOpenOpsTablesPost: (...args: unknown[]) => mockPost(...args),
  makeOpenOpsTablesPatch: (...args: unknown[]) => mockPatch(...args),
  makeOpenOpsTablesDelete: (...args: unknown[]) => mockDelete(...args),
}));

import { ApplicationError, ErrorCode, TableColumnType } from '@openops/shared';
import { tablesService } from '../../../src/app/tables/tables.service';

// The writes check ownership and columns through the read methods of the same service,
// which have their own tests.
const mockListTableColumns = jest.spyOn(tablesService, 'listTableColumns');
const mockGetTable = jest.spyOn(tablesService, 'getTable');

const projectId = 'proj12345678901234567';
const tokenResolver = { getToken: () => 'db-token' };
const tablesContext = {
  tablesDatabaseId: 100,
  tablesDatabaseToken: { iv: 'iv', data: 'enc' },
};
const columns = [
  { id: 1, name: 'ID', type: 'uuid', primary: true, readOnly: true },
  { id: 2, name: 'Name', type: 'text', primary: false, readOnly: false },
  { id: 3, name: 'Owner', type: 'text', primary: false, readOnly: false },
];
const schemaColumns = [
  { id: 1, name: 'Name', type: 'text', primary: true, readOnly: false },
  { id: 2, name: 'Cost', type: 'number', primary: false, readOnly: false },
  {
    id: 3,
    name: 'Status',
    type: 'single_select',
    primary: false,
    readOnly: false,
    options: [
      { id: 31, value: 'Open' },
      { id: 32, value: 'Closed' },
    ],
  },
];

function baserowError(error: string, detail: unknown): Error {
  return new Error(JSON.stringify({ error, detail }));
}

async function expectValidationError(
  promise: Promise<unknown>,
  message: string | RegExp,
): Promise<void> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApplicationError);
  expect((error as ApplicationError).error.code).toBe(ErrorCode.VALIDATION);
  expect(
    (error as ApplicationError).error.params as { message: string },
  ).toEqual({ message: expect.stringMatching(message) });
}

describe('tablesService (row writes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectService.getOneOrThrow.mockResolvedValue({
      id: projectId,
      ...tablesContext,
    });
    mockResolveTokenProvider.mockResolvedValue(tokenResolver);
    mockListTableColumns.mockResolvedValue(columns);
  });

  describe('createRows', () => {
    it('validates columns via the read service, then creates and flattens the batch', async () => {
      mockBatchCreateRows.mockResolvedValue([
        {
          items: [
            { id: 10, Name: 'a', Owner: null },
            { id: 11, Name: 'b', Owner: 'o', Created: 'x' },
          ],
        },
      ]);

      const result = await tablesService.createRows(projectId, 5, {
        rows: [{ Name: 'a' }, { Name: 'b', Owner: 'o' }],
      });

      expect(mockListTableColumns).toHaveBeenCalledWith(projectId, 5);
      expect(mockBatchCreateRows).toHaveBeenCalledWith({
        tableId: 5,
        tokenOrResolver: tokenResolver,
        items: [{ Name: 'a' }, { Name: 'b', Owner: 'o' }],
      });
      expect(result).toEqual({
        rows: [
          { id: 10, Name: 'a' },
          { id: 11, Name: 'b', Owner: 'o' },
        ],
      });
    });

    it('returns only the id and the columns that were written', async () => {
      mockBatchCreateRows.mockResolvedValue([
        {
          items: [
            {
              id: 10,
              order: '1.0',
              Name: 'a',
              Owner: null,
              Created: '2026-01-01',
            },
          ],
        },
      ]);

      const result = await tablesService.createRows(projectId, 5, {
        rows: [{ Name: 'a' }],
      });

      expect(result).toEqual({ rows: [{ id: 10, Name: 'a' }] });
    });

    it('keeps row order when the helper returns more than one chunk', async () => {
      mockBatchCreateRows.mockResolvedValue([
        { items: [{ id: 10, Name: 'a' }] },
        { items: [{ id: 11, Name: 'b' }] },
      ]);

      const result = await tablesService.createRows(projectId, 5, {
        rows: [{ Name: 'a' }, { Name: 'b' }],
      });

      expect(result.rows.map((row) => row['id'])).toEqual([10, 11]);
    });

    it('reads nested errors for list-valued columns instead of [object Object]', async () => {
      mockBatchCreateRows.mockRejectedValue(
        new Error(
          JSON.stringify({
            error: 'ERROR_REQUEST_BODY_VALIDATION',
            detail: {
              items: {
                '0': {
                  Owner: {
                    '1': [
                      { error: 'Option 99 does not exist.', code: 'invalid' },
                    ],
                  },
                },
              },
            },
          }),
        ),
      );

      await expect(
        tablesService.createRows(projectId, 5, { rows: [{ Owner: 'x' }] }),
      ).rejects.toMatchObject({
        error: {
          params: {
            message:
              'ERROR_REQUEST_BODY_VALIDATION: row 1, Owner: Option 99 does not exist.',
          },
        },
      });
    });

    it('lets non-Baserow failures propagate unchanged as server errors', async () => {
      mockBatchCreateRows.mockRejectedValue(new Error('socket hang up'));

      await expect(
        tablesService.createRows(projectId, 5, { rows: [{ Name: 'a' }] }),
      ).rejects.toThrow('socket hang up');
    });

    it('flattens Baserow field validation errors into row and column lines', async () => {
      mockBatchCreateRows.mockRejectedValue(
        new Error(
          JSON.stringify({
            error: 'ERROR_REQUEST_BODY_VALIDATION',
            detail: {
              items: {
                '0': {
                  Owner: [
                    { error: 'A valid email is required.', code: 'invalid' },
                  ],
                },
                '1': {
                  Name: [
                    { error: 'This field may not be blank.', code: 'blank' },
                  ],
                },
              },
            },
          }),
        ),
      );

      await expect(
        tablesService.createRows(projectId, 5, {
          rows: [{ Owner: 'x' }, { Name: '' }],
        }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: {
            message:
              'ERROR_REQUEST_BODY_VALIDATION: row 1, Owner: A valid email is required. | ' +
              'row 2, Name: This field may not be blank.',
          },
        },
      });
    });

    it('rejects unknown columns before touching Baserow, naming the writable ones', async () => {
      await expect(
        tablesService.createRows(projectId, 5, { rows: [{ Nmae: 'a' }] }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: {
            message: 'Unknown column(s): Nmae. Writable columns: Name, Owner',
          },
        },
      });
      expect(mockBatchCreateRows).not.toHaveBeenCalled();
    });

    it('rejects read-only columns', async () => {
      await expect(
        tablesService.createRows(projectId, 5, {
          rows: [{ Name: 'a', ID: 'forced' }],
        }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: { message: 'Read-only column(s) cannot be written: ID' },
        },
      });
      expect(mockBatchCreateRows).not.toHaveBeenCalled();
    });

    it('rejects an empty row', async () => {
      await expect(
        tablesService.createRows(projectId, 5, { rows: [{}] }),
      ).rejects.toMatchObject({ error: { code: ErrorCode.VALIDATION } });
      expect(mockListTableColumns).not.toHaveBeenCalled();
    });

    it('propagates the read service 404 for a table outside the project', async () => {
      mockListTableColumns.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'table', entityId: '999' },
        }),
      );

      await expect(
        tablesService.createRows(projectId, 999, { rows: [{ Name: 'a' }] }),
      ).rejects.toMatchObject({ error: { code: ErrorCode.ENTITY_NOT_FOUND } });
    });

    it('turns a Baserow error into a validation error', async () => {
      mockBatchCreateRows.mockRejectedValue(
        new Error(
          JSON.stringify({
            error: 'ERROR_REQUEST_BODY_VALIDATION',
            detail: 'Name is required.',
          }),
        ),
      );

      await expect(
        tablesService.createRows(projectId, 5, { rows: [{ Owner: 'o' }] }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: {
            message: 'ERROR_REQUEST_BODY_VALIDATION: Name is required.',
          },
        },
      });
    });
  });

  describe('updateRows', () => {
    it('maps rows to the batch helper shape and flattens the result', async () => {
      mockBatchUpdateRows.mockResolvedValue([
        { items: [{ id: 7, Name: 'untouched', Owner: 'y', Created: 'x' }] },
      ]);

      const result = await tablesService.updateRows(projectId, 5, {
        rows: [{ id: 7, fields: { Owner: 'y' } }],
      });

      expect(mockBatchUpdateRows).toHaveBeenCalledWith({
        tableId: 5,
        tokenOrResolver: tokenResolver,
        items: [{ rowId: 7, fields: { Owner: 'y' } }],
      });
      expect(result).toEqual({ rows: [{ id: 7, Owner: 'y' }] });
    });

    it('validates the fields of every row', async () => {
      await expect(
        tablesService.updateRows(projectId, 5, {
          rows: [
            { id: 7, fields: { Owner: 'y' } },
            { id: 8, fields: { Bogus: 1 } },
          ],
        }),
      ).rejects.toMatchObject({ error: { code: ErrorCode.VALIDATION } });
      expect(mockBatchUpdateRows).not.toHaveBeenCalled();
    });

    it('surfaces a missing row as a validation error with Baserow detail', async () => {
      mockBatchUpdateRows.mockRejectedValue(
        new Error(
          JSON.stringify({
            error: 'ERROR_ROW_DOES_NOT_EXIST',
            detail: 'The rows 99 do not exist.',
          }),
        ),
      );

      await expect(
        tablesService.updateRows(projectId, 5, {
          rows: [{ id: 99, fields: { Owner: 'y' } }],
        }),
      ).rejects.toMatchObject({
        error: {
          code: ErrorCode.VALIDATION,
          params: {
            message: 'ERROR_ROW_DOES_NOT_EXIST: The rows 99 do not exist.',
          },
        },
      });
    });
  });

  describe('updateRows result mapping', () => {
    it('matches results to requests by id even if Baserow reorders or omits rows', async () => {
      mockBatchUpdateRows.mockResolvedValue([
        { items: [{ id: 8, Owner: 'z', Name: 'n' }] },
      ]);

      const result = await tablesService.updateRows(projectId, 5, {
        rows: [
          { id: 7, fields: { Name: 'x' } },
          { id: 8, fields: { Owner: 'z' } },
        ],
      });

      expect(result).toEqual({ rows: [{ id: 8, Owner: 'z' }] });
    });
  });

  describe('deleteRows', () => {
    it('checks table ownership, deletes, and reports the count', async () => {
      mockBatchDeleteRows.mockResolvedValue(undefined);

      const result = await tablesService.deleteRows(projectId, 5, [3, 5]);

      expect(mockListTableColumns).toHaveBeenCalledWith(projectId, 5);
      expect(mockBatchDeleteRows).toHaveBeenCalledWith({
        tableId: 5,
        tokenOrResolver: tokenResolver,
        rowIds: [3, 5],
      });
      expect(result).toEqual({ deleted: 2 });
    });

    it('does not delete when the table is outside the project', async () => {
      mockListTableColumns.mockRejectedValue(
        new ApplicationError({
          code: ErrorCode.ENTITY_NOT_FOUND,
          params: { entityType: 'table', entityId: '999' },
        }),
      );

      await expect(
        tablesService.deleteRows(projectId, 999, [1]),
      ).rejects.toMatchObject({ error: { code: ErrorCode.ENTITY_NOT_FOUND } });
      expect(mockBatchDeleteRows).not.toHaveBeenCalled();
    });
  });
});

describe('tablesService (schema writes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectService.getOneOrThrow.mockResolvedValue({
      id: projectId,
      ...tablesContext,
    });
    mockResolveTokenProvider.mockResolvedValue(tokenResolver);
    mockListTableColumns.mockResolvedValue(schemaColumns);
  });

  describe('createTable', () => {
    it('passes name and data to the existing helper and returns the table with its link', async () => {
      mockCreateTable.mockResolvedValue({ id: 77, name: 'Idle VMs' });
      const details = { id: 77, name: 'Idle VMs', url: 'http://ui/t/77' };
      mockGetTable.mockResolvedValue(details);
      const data = [
        ['VM', 'Region'],
        ['vm-1', 'eu-west-1'],
      ];

      const result = await tablesService.createTable(projectId, {
        name: 'Idle VMs',
        data,
      });

      expect(mockCreateTable).toHaveBeenCalledWith(
        tablesContext,
        'Idle VMs',
        data,
      );
      expect(mockGetTable).toHaveBeenCalledWith(projectId, 77);
      expect(result).toEqual(details);
    });

    it('rejects rows whose length differs from the header', async () => {
      await expectValidationError(
        tablesService.createTable(projectId, {
          name: 'T',
          data: [['A', 'B'], ['1']],
        }),
        /row 1 has 1 cell\(s\); the header has 2/,
      );
      expect(mockCreateTable).not.toHaveBeenCalled();
    });

    it('translates a Baserow error, e.g. repeated column names, into a validation error', async () => {
      mockCreateTable.mockRejectedValue(
        baserowError(
          'ERROR_INITIAL_TABLE_DATA_HAS_DUPLICATE_NAMES',
          'Field names must be unique.',
        ),
      );

      await expectValidationError(
        tablesService.createTable(projectId, {
          name: 'T',
          data: [['A', 'A']],
        }),
        'ERROR_INITIAL_TABLE_DATA_HAS_DUPLICATE_NAMES: Field names must be unique.',
      );
    });
  });

  describe('addColumn', () => {
    it('checks the table, then creates the column and maps the response', async () => {
      mockPost.mockResolvedValue({
        id: 9,
        name: 'Tier',
        type: 'single_select',
        primary: false,
        read_only: false,
        select_options: [
          { id: 91, value: 'Gold', color: 'blue' },
          { id: 92, value: 'Silver', color: 'green' },
        ],
      });

      const result = await tablesService.addColumn(projectId, 5, {
        name: 'Tier',
        type: TableColumnType.SINGLE_SELECT,
        selectOptions: ['Gold', 'Silver'],
      });

      expect(mockListTableColumns).toHaveBeenCalledWith(projectId, 5);
      expect(mockPost).toHaveBeenCalledWith(
        'api/database/fields/table/5/',
        {
          name: 'Tier',
          type: 'single_select',
          select_options: [
            { value: 'Gold', color: 'blue' },
            { value: 'Silver', color: 'green' },
          ],
        },
        expect.anything(),
      );
      expect(result).toEqual({
        id: 9,
        name: 'Tier',
        type: 'single_select',
        primary: false,
        readOnly: false,
        options: [
          { id: 91, value: 'Gold' },
          { id: 92, value: 'Silver' },
        ],
      });
    });

    it('maps number and date options', async () => {
      mockPost.mockResolvedValue({ id: 10, name: 'X', type: 'number' });

      await tablesService.addColumn(projectId, 5, {
        name: 'Savings',
        type: TableColumnType.NUMBER,
        decimalPlaces: 2,
      });
      await tablesService.addColumn(projectId, 5, {
        name: 'Seen',
        type: TableColumnType.DATE,
        includeTime: true,
      });

      expect(mockPost.mock.calls[0][1]).toEqual({
        name: 'Savings',
        type: 'number',
        number_decimal_places: 2,
      });
      expect(mockPost.mock.calls[1][1]).toEqual({
        name: 'Seen',
        type: 'date',
        date_include_time: true,
      });
    });

    it('rejects options that do not belong to the column type', async () => {
      await expectValidationError(
        tablesService.addColumn(projectId, 5, {
          name: 'X',
          type: TableColumnType.TEXT,
          selectOptions: ['a'],
        }),
        /selectOptions only applies to single_select and multiple_select/,
      );
      await expectValidationError(
        tablesService.addColumn(projectId, 5, {
          name: 'X',
          type: TableColumnType.TEXT,
          decimalPlaces: 2,
        }),
        /decimalPlaces only applies to number/,
      );
      await expectValidationError(
        tablesService.addColumn(projectId, 5, {
          name: 'X',
          type: TableColumnType.NUMBER,
          includeTime: true,
        }),
        /includeTime only applies to date/,
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('rejects duplicate select option labels', async () => {
      await expectValidationError(
        tablesService.addColumn(projectId, 5, {
          name: 'X',
          type: TableColumnType.MULTIPLE_SELECT,
          selectOptions: ['a', 'b', 'a'],
        }),
        /Duplicate option\(s\): a/,
      );
    });

    it('propagates table-not-found from the read service', async () => {
      const notFound = new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: { entityType: 'table', entityId: '5' },
      });
      mockListTableColumns.mockRejectedValue(notFound);

      await expect(
        tablesService.addColumn(projectId, 5, {
          name: 'X',
          type: TableColumnType.TEXT,
        }),
      ).rejects.toBe(notFound);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('translates a Baserow error, e.g. a duplicate column name', async () => {
      mockPost.mockRejectedValue(
        baserowError(
          'ERROR_FIELD_WITH_SAME_NAME_ALREADY_EXISTS',
          'A field with this name already exists.',
        ),
      );

      await expectValidationError(
        tablesService.addColumn(projectId, 5, {
          name: 'Cost',
          type: TableColumnType.TEXT,
        }),
        'ERROR_FIELD_WITH_SAME_NAME_ALREADY_EXISTS: A field with this name already exists.',
      );
    });
  });

  describe('updateColumn', () => {
    it('renames a column without touching its type', async () => {
      mockPatch.mockResolvedValue({
        id: 2,
        name: 'Monthly cost',
        type: 'number',
      });

      const result = await tablesService.updateColumn(projectId, 5, 2, {
        name: 'Monthly cost',
      });

      expect(mockPatch).toHaveBeenCalledWith(
        'api/database/fields/2/',
        { name: 'Monthly cost' },
        expect.anything(),
      );
      expect(result).toMatchObject({ id: 2, name: 'Monthly cost' });
    });

    it('keeps existing option ids and colors so cell values survive', async () => {
      mockGetFields.mockResolvedValue([
        {
          id: 3,
          name: 'Status',
          type: 'single_select',
          select_options: [
            { id: 31, value: 'Open', color: 'red' },
            { id: 32, value: 'Closed', color: 'gray' },
          ],
        },
      ]);
      mockPatch.mockResolvedValue({
        id: 3,
        name: 'Status',
        type: 'single_select',
      });

      await tablesService.updateColumn(projectId, 5, 3, {
        selectOptions: ['Open', 'Snoozed'],
      });

      expect(mockGetFields).toHaveBeenCalledWith(5, tokenResolver);
      expect(mockPatch.mock.calls[0][1]).toEqual({
        select_options: [
          { id: 31, value: 'Open', color: 'red' },
          { value: 'Snoozed', color: 'green' },
        ],
      });
    });

    it('checks type-specific options against the current type when type is omitted', async () => {
      await expectValidationError(
        tablesService.updateColumn(projectId, 5, 2, {
          selectOptions: ['a'],
        }),
        /selectOptions only applies to single_select and multiple_select/,
      );
      expect(mockPatch).not.toHaveBeenCalled();
    });

    it('sends a type change with its options', async () => {
      mockPatch.mockResolvedValue({ id: 2, name: 'Cost', type: 'text' });

      await tablesService.updateColumn(projectId, 5, 2, {
        type: TableColumnType.TEXT,
      });

      expect(mockPatch.mock.calls[0][1]).toEqual({ type: 'text' });
    });

    it('returns not found for a column outside the table', async () => {
      const error = await tablesService
        .updateColumn(projectId, 5, 999, { name: 'X' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).error).toEqual({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: { entityType: 'column', entityId: '999' },
      });
      expect(mockPatch).not.toHaveBeenCalled();
    });
  });

  describe('deleteColumn', () => {
    it('deletes a non-primary column of the table', async () => {
      mockDelete.mockResolvedValue({ related_fields: [] });

      const result = await tablesService.deleteColumn(projectId, 5, 2);

      expect(mockDelete).toHaveBeenCalledWith(
        'api/database/fields/2/',
        expect.anything(),
      );
      expect(result).toEqual({ id: 2 });
    });

    it('refuses to delete the primary column', async () => {
      await expectValidationError(
        tablesService.deleteColumn(projectId, 5, 1),
        /primary column cannot be deleted/,
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('returns not found for a column outside the table', async () => {
      const error = await tablesService
        .deleteColumn(projectId, 5, 999)
        .catch((e: unknown) => e);

      expect((error as ApplicationError).error.code).toBe(
        ErrorCode.ENTITY_NOT_FOUND,
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
