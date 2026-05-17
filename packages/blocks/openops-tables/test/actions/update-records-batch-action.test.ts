const cacheWrapperMock = {
  getSerializedObject: jest.fn(),
  setSerializedObject: jest.fn(),
  getOrAdd: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  cacheWrapper: cacheWrapperMock,
}));

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  batchUpdateRows: jest.fn(),
  getFields: jest.fn(),
  getPrimaryKeyFieldFromFields: jest.fn(),
  getTableIdByTableName: jest.fn(),
  openopsTablesDropdownProperty: jest.fn().mockReturnValue({
    required: true,
    defaultValue: false,
    type: 'DROPDOWN',
  }),
  resolveTokenProvider: jest.fn(async (serverContext) => {
    return {
      getToken: () => serverContext.tablesDatabaseToken,
    };
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);

import { getFields, getTableIdByTableName } from '@openops/common';
import { nanoid } from 'nanoid';
import { updateRecordsBatchAction } from '../../src/actions/update-records-batch-action';

describe('updateRecordsBatchAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(updateRecordsBatchAction.props).length).toBe(2);
    expect(updateRecordsBatchAction.props).toMatchObject({
      tableName: {
        required: true,
        type: 'DROPDOWN',
      },
      items: {
        required: true,
        type: 'JSON',
      },
    });
  });

  test('should resolve table metadata and batch update rows', async () => {
    cacheWrapperMock.getOrAdd
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce([{ name: 'ID', primary: true }]);
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'ID',
      primary: true,
    });
    openopsCommonMock.batchUpdateRows.mockResolvedValue([{ id: 101 }]);

    const context = createContext({
      items: [
        {
          rowPrimaryKey: 'row-1',
          fields: { Owner: 'leyla@openops.com' },
        },
      ],
    });

    const result = await updateRecordsBatchAction.run(context);

    expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
      1,
      `${context.run.id}-table-${context.propsValue.tableName}`,
      getTableIdByTableName,
      [context.propsValue.tableName, context.server],
    );
    expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
      2,
      `${context.run.id}-1-fields`,
      getFields,
      [
        1,
        expect.objectContaining({
          getToken: expect.any(Function),
        }),
      ],
    );
    expect(openopsCommonMock.resolveTokenProvider).toHaveBeenCalledWith(
      context.server,
    );
    expect(openopsCommonMock.getPrimaryKeyFieldFromFields).toHaveBeenCalledWith(
      [{ name: 'ID', primary: true }],
    );
    expect(openopsCommonMock.batchUpdateRows).toHaveBeenCalledWith({
      tableId: 1,
      tokenOrResolver: expect.objectContaining({
        getToken: expect.any(Function),
      }),
      primaryKeyFieldName: 'ID',
      items: [
        {
          rowPrimaryKey: 'row-1',
          fields: { Owner: 'leyla@openops.com' },
        },
      ],
    });
    expect(result).toEqual([{ id: 101 }]);
  });

  test('should reject non-array items', async () => {
    const context = createContext({
      items: { rowPrimaryKey: 'row-1', fields: { Owner: 'a@b.com' } },
    });

    await expect(updateRecordsBatchAction.run(context)).rejects.toThrow(
      'Items must be an array of objects with rowPrimaryKey and fields.',
    );

    expect(cacheWrapperMock.getOrAdd).not.toHaveBeenCalled();
    expect(openopsCommonMock.batchUpdateRows).not.toHaveBeenCalled();
  });

  test('should reject invalid batch update items', async () => {
    const context = createContext({
      items: [
        {
          rowPrimaryKey: '',
          fields: { Owner: 'a@b.com' },
        },
      ],
    });

    await expect(updateRecordsBatchAction.run(context)).rejects.toThrow(
      'Each item must include a non-empty string rowPrimaryKey and an object fields value.',
    );

    expect(cacheWrapperMock.getOrAdd).not.toHaveBeenCalled();
    expect(openopsCommonMock.batchUpdateRows).not.toHaveBeenCalled();
  });
});

function createContext(params?: { tableName?: string; items?: unknown }) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    propsValue: {
      tableName: params?.tableName ?? 'Opportunity',
      items: params?.items ?? [],
    },
    server: {
      tablesDatabaseId: 1,
      tablesDatabaseToken: 'token',
    },
    run: {
      id: nanoid(),
    },
  };
}
