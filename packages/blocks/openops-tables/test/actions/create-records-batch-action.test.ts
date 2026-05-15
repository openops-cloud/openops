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
  createRowsBatch: jest.fn(),
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

import { getTableIdByTableName } from '@openops/common';
import { nanoid } from 'nanoid';
import { createRecordsBatchAction } from '../../src/actions/create-records-batch-action';

describe('createRecordsBatchAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(createRecordsBatchAction.props).length).toBe(2);
    expect(createRecordsBatchAction.props).toMatchObject({
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

  test('should resolve table and batch create rows', async () => {
    cacheWrapperMock.getOrAdd.mockResolvedValue(1);
    openopsCommonMock.createRowsBatch.mockResolvedValue([{ id: 101 }]);

    const context = createContext({
      items: [{ field1: 'row one' }, { field1: 'row two' }],
    });

    const result = await createRecordsBatchAction.run(context);

    validateWrapperCall(context);
    expect(openopsCommonMock.resolveTokenProvider).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.resolveTokenProvider).toHaveBeenCalledWith({
      tablesDatabaseId: 1,
      tablesDatabaseToken: 'token',
    });
    expect(openopsCommonMock.createRowsBatch).toHaveBeenCalledWith({
      tableId: 1,
      tokenOrResolver: expect.objectContaining({
        getToken: expect.any(Function),
      }),
      items: [{ field1: 'row one' }, { field1: 'row two' }],
    });
    expect(result).toEqual([{ id: 101 }]);
  });

  test('should reject non-array items', async () => {
    const context = createContext({
      items: { field1: 'row one' },
    });

    await expect(createRecordsBatchAction.run(context)).rejects.toThrow(
      'Items must be an array of row objects.',
    );

    expect(cacheWrapperMock.getOrAdd).not.toHaveBeenCalled();
    expect(openopsCommonMock.createRowsBatch).not.toHaveBeenCalled();
  });

  test('should reject non-object array items', async () => {
    const context = createContext({
      items: [{ field1: 'row one' }, 'bad-item'],
    });

    await expect(createRecordsBatchAction.run(context)).rejects.toThrow(
      'Each item must be an object keyed by table field names.',
    );

    expect(cacheWrapperMock.getOrAdd).not.toHaveBeenCalled();
    expect(openopsCommonMock.createRowsBatch).not.toHaveBeenCalled();
  });
});

function validateWrapperCall(context: ReturnType<typeof createContext>) {
  expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledTimes(1);
  expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledWith(
    `${context.run.id}-table-${context.propsValue.tableName}`,
    getTableIdByTableName,
    [
      context.propsValue.tableName,
      {
        tablesDatabaseId: context.server.tablesDatabaseId,
        tablesDatabaseToken: context.server.tablesDatabaseToken,
      },
    ],
  );
}

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
