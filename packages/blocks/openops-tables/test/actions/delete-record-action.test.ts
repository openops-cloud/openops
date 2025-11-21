const cacheWrapperMock = {
  getSerializedObject: jest.fn(),
  setSerializedObject: jest.fn(),
  getOrAdd: jest.fn(),
};

jest.mock('@openops/server-shared', () => ({
  cacheWrapper: cacheWrapperMock,
}));

const openopsCommonMock = {
  authenticateDefaultUserInOpenOpsTables: jest.fn(),
  getRowByPrimaryKeyValue: jest.fn(),
  getPrimaryKeyFieldFromFields: jest.fn(),
  getTokenForBlock: jest.fn(),
  openopsTablesDropdownProperty: jest.fn().mockReturnValue({
    required: true,
    defaultValue: false,
    type: 'DROPDOWN',
  }),
  deleteRow: jest.fn(),
};

jest.mock('@openops/common', () => openopsCommonMock);
import { nanoid } from 'nanoid';
import { deleteRecordAction } from '../../src/actions/delete-record-action';

import {
  getFieldsFromContext,
  getTableIdByTableNameFromContext,
} from '@openops/common';

describe('deleteRecordAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(deleteRecordAction.props).length).toBe(2);
    expect(deleteRecordAction.props).toMatchObject({
      tableName: {
        required: true,
        type: 'DROPDOWN',
      },
      rowPrimaryKey: {
        required: true,
        type: 'LONG_TEXT',
      },
    });
  });

  test('should authenticate', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
    });
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue([{ id: 1 }]);
    openopsCommonMock.getTokenForBlock.mockResolvedValue({
      token: 'some databaseToken',
      useDatabaseToken: true,
    });
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });
    cacheWrapperMock.getOrAdd
      .mockReturnValueOnce(1)
      .mockReturnValue('mock result');
    openopsCommonMock.deleteRow.mockResolvedValue('mock result');

    const context = createContext();

    const result = (await deleteRecordAction.run(context)) as any;

    validateWrapperCall(context);

    expect(result).toStrictEqual('mock result');
    expect(openopsCommonMock.getTokenForBlock).toHaveBeenCalledTimes(1);
  });

  test.each([[[]], [{}]])(
    'should throw if the primary key is not a valid string',
    async (rowPrimaryKey: any) => {
      openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
        name: 'primary key field',
      });
      cacheWrapperMock.getOrAdd
        .mockReturnValueOnce(1)
        .mockReturnValue(['some field']);
      openopsCommonMock.getTokenForBlock.mockResolvedValue({
        token: 'some databaseToken',
        useDatabaseToken: true,
      });
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue(
        { token: 'some databaseToken' },
      );
      const context = createContext({
        tableName: 'Opportunity',
        rowPrimaryKey: rowPrimaryKey,
      });

      await expect(deleteRecordAction.run(context)).rejects.toThrow(
        'The primary key should be a string',
      );

      validateWrapperCall(context);

      expect(
        openopsCommonMock.getPrimaryKeyFieldFromFields,
      ).toHaveBeenCalledTimes(1);
      expect(
        openopsCommonMock.getPrimaryKeyFieldFromFields,
      ).toHaveBeenCalledWith(['some field']);
      expect(openopsCommonMock.getRowByPrimaryKeyValue).not.toHaveBeenCalled();
    },
  );

  test.each([[''], ['   ']])(
    'should throw if the primary key is an empty string',
    async (rowPrimaryKey: any) => {
      openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
        name: 'primary key field',
      });
      cacheWrapperMock.getOrAdd
        .mockReturnValueOnce(1)
        .mockReturnValue(['some field']);
      openopsCommonMock.getTokenForBlock.mockResolvedValue({
        token: 'some databaseToken',
        useDatabaseToken: true,
      });
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue(
        { token: 'some databaseToken' },
      );
      const context = createContext({
        tableName: 'Opportunity',
        rowPrimaryKey: rowPrimaryKey,
      });

      await expect(deleteRecordAction.run(context)).rejects.toThrow(
        'Record Primary Key is not defined.',
      );

      validateWrapperCall(context);

      expect(
        openopsCommonMock.getPrimaryKeyFieldFromFields,
      ).toHaveBeenCalledTimes(1);
      expect(
        openopsCommonMock.getPrimaryKeyFieldFromFields,
      ).toHaveBeenCalledWith(['some field']);
      expect(openopsCommonMock.getRowByPrimaryKeyValue).not.toHaveBeenCalled();
    },
  );

  test('should throw if no row was found with primary key', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
      type: 'text',
    });
    cacheWrapperMock.getOrAdd
      .mockReturnValueOnce(1)
      .mockReturnValue(['some field']);
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue(undefined);
    openopsCommonMock.getTokenForBlock.mockResolvedValue({
      token: 'some databaseToken',
      useDatabaseToken: true,
    });
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });
    const context = createContext({
      tableName: 'Opportunity',
      rowPrimaryKey: 'some primary key value',
    });

    await expect(deleteRecordAction.run(context)).rejects.toThrow(
      'No record found with given primary key',
    );

    validateWrapperCall(context);

    expect(
      openopsCommonMock.getPrimaryKeyFieldFromFields,
    ).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getPrimaryKeyFieldFromFields).toHaveBeenCalledWith(
      ['some field'],
    );
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledWith(
      'some databaseToken',
      1,
      'some primary key value',
      'primary key field',
      'text',
      true,
    );
  });

  test('should delete record', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
      type: 'text',
    });
    cacheWrapperMock.getOrAdd
      .mockReturnValueOnce(1)
      .mockReturnValue(['some field']);
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue({ id: 1 });
    openopsCommonMock.deleteRow.mockResolvedValue('mock result');
    openopsCommonMock.getTokenForBlock.mockResolvedValue({
      token: 'some databaseToken',
      useDatabaseToken: true,
    });
    const context = createContext({
      tableName: 'Opportunity',
      rowPrimaryKey: 'some primary key value',
    });
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });

    const result = (await deleteRecordAction.run(context)) as any;

    expect(result).toBe('mock result');

    validateWrapperCall(context);

    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledWith(
      'some databaseToken',
      1,
      'some primary key value',
      'primary key field',
      'text',
      true,
    );
    expect(
      openopsCommonMock.getPrimaryKeyFieldFromFields,
    ).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getPrimaryKeyFieldFromFields).toHaveBeenCalledWith(
      ['some field'],
    );
    expect(openopsCommonMock.deleteRow).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.deleteRow).toHaveBeenCalledWith({
      tableId: 1,
      token: 'some databaseToken',
      rowId: 1,
      useDatabaseToken: true,
    });
  });
});

function validateWrapperCall(context: any) {
  expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledTimes(2);
  expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
    1,
    `${context.run.id}-table-${context.propsValue.tableName}`,
    getTableIdByTableNameFromContext,
    [context.propsValue.tableName, context],
  );
  expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
    2,
    `${context.run.id}-1-fields`,
    getFieldsFromContext,
    [1, context],
  );
}

interface ContextParams {
  tableName?: string;
  rowPrimaryKey?: string;
}

function createContext(params?: ContextParams) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    propsValue: {
      tableName: params?.tableName ?? '1',
      rowPrimaryKey: params?.rowPrimaryKey ?? 'default primary key',
    },
    run: {
      id: nanoid(),
    },
    server: {
      tablesDatabaseId: 1,
      tablesDatabaseToken: 'encrypted-token',
    },
  };
}
