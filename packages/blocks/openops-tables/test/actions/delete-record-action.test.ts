jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  cacheWrapper: {
    getSerializedObject: jest.fn(),
    setSerializedObject: jest.fn(),
  },
}));

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  authenticateDefaultUserInOpenOpsTables: jest.fn(),
  getRowByPrimaryKeyValue: jest.fn(),
  getPrimaryKeyFieldFromFields: jest.fn(),
  getFields: jest.fn(),
  getTableIdByTableName: jest.fn().mockReturnValue(1),
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
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });
    openopsCommonMock.getFields.mockResolvedValue(['some field']);
    openopsCommonMock.deleteRow.mockResolvedValue('mock result');

    const context = createContext();

    const result = (await deleteRecordAction.run(context)) as any;

    expect(result).toStrictEqual('mock result');
    expect(
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
    ).toHaveBeenCalledTimes(1);
    expect(
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
    ).toHaveBeenCalledWith();
  });

  test.each([[[]], [{}]])(
    'should throw if the primary key is not a valid string',
    async (rowPrimaryKey: any) => {
      openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
        name: 'primary key field',
      });
      openopsCommonMock.getFields.mockResolvedValue(['some field']);
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

      expect(openopsCommonMock.getFields).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getFields).toHaveBeenCalledWith(
        1,
        'some databaseToken',
      );
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
      openopsCommonMock.getFields.mockResolvedValue(['some field']);
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

      expect(openopsCommonMock.getFields).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getFields).toHaveBeenCalledWith(
        1,
        'some databaseToken',
      );
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
    });
    openopsCommonMock.getFields.mockResolvedValue(['some field']);
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue(undefined);
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

    expect(openopsCommonMock.getFields).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getFields).toHaveBeenCalledWith(
      1,
      'some databaseToken',
    );
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
    );
  });

  test('should delete record', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
    });
    openopsCommonMock.getFields.mockResolvedValue(['some field']);
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue({ id: 1 });
    openopsCommonMock.deleteRow.mockResolvedValue('mock result');
    const context = createContext({
      tableName: 'Opportunity',
      rowPrimaryKey: 'some primary key value',
    });

    const result = (await deleteRecordAction.run(context)) as any;

    expect(result).toBe('mock result');
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledWith(
      'some databaseToken',
      1,
      'some primary key value',
      'primary key field',
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
    });
  });
});

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
      executionCorrelationId: nanoid(),
    },
  };
}
