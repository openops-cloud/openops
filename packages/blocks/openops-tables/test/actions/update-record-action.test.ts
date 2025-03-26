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
  authenticateDefaultUserInOpenOpsTables: jest.fn(),
  getRowByPrimaryKeyValue: jest.fn(),
  getPrimaryKeyFieldFromFields: jest.fn(),
  getTableFields: jest.fn().mockResolvedValue([{}]),
  openopsTablesDropdownProperty: jest.fn().mockReturnValue({
    required: true,
    defaultValue: false,
    type: 'DROPDOWN',
  }),
  updateRow: jest.fn(),
  addRow: jest.fn(),
};

jest.mock('@openops/common', () => openopsCommonMock);
import { DynamicPropsValue } from '@openops/blocks-framework';
import { getFields, getTableIdByTableName } from '@openops/common';
import { nanoid } from 'nanoid';
import { updateRecordAction } from '../../src/actions/update-record-action';

describe('updateRowAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(updateRecordAction.props).length).toBe(3);
    expect(updateRecordAction.props).toMatchObject({
      tableName: {
        required: true,
        type: 'DROPDOWN',
      },
      rowPrimaryKey: {
        required: true,
        type: 'DYNAMIC',
      },
      fieldsProperties: {
        type: 'DYNAMIC',
        required: true,
      },
    });
  });

  test('should return rowPrimaryKey as required when field is not readonly', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
      read_only: false,
    });

    const context = createContext();
    const result = await updateRecordAction.props['rowPrimaryKey'].props(
      { tableName: 'Opportunity' } as DynamicPropsValue,
      context,
    );

    expect(result['rowPrimaryKey']).toMatchObject({
      displayName: 'Primary Key Value',
      required: true,
      type: 'SHORT_TEXT',
      description:
        'The primary key value of the row to update. If the row does not exist, a new row will be created.',
    });
  });

  test('should return rowPrimaryKey as not required when field is readonly', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
      read_only: true,
    });

    const context = createContext();
    const result = await updateRecordAction.props['rowPrimaryKey'].props(
      { tableName: 'Opportunity' } as DynamicPropsValue,
      context,
    );

    expect(result['rowPrimaryKey']).toMatchObject({
      displayName: 'Primary Key Value',
      required: false,
      type: 'SHORT_TEXT',
      description:
        'The primary key value of the row to update. If left empty, a new row will be created.',
    });
  });

  test('should authenticate', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
    });
    cacheWrapperMock.getOrAdd
      .mockReturnValueOnce(1)
      .mockReturnValue([{ id: 1, primary: true }]);

    openopsCommonMock.addRow.mockResolvedValue('mock result');

    const context = createContext();

    const result = (await updateRecordAction.run(context)) as any;

    validateWrapperCall(context);
    expect(result).toStrictEqual('mock result');
    expect(
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
    ).toHaveBeenCalledTimes(1);
    expect(
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
    ).toHaveBeenCalledWith();
  });

  test('should update fields', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
    });
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue({ id: 1 });

    cacheWrapperMock.getOrAdd.mockReturnValueOnce(1).mockReturnValue([
      { id: 1, primary: true, name: 'id' },
      { id: 2, primary: false, name: 'field1' },
    ]);

    openopsCommonMock.updateRow.mockResolvedValue('mock result');
    const context = createContext({
      tableName: 'Opportunity',
      rowPrimaryKey: { rowPrimaryKey: 'some primary key value' },
      fieldsProperties: [
        {
          fieldName: 'field1',
          newFieldValue: { newFieldValue: 'new value' },
        },
      ],
    });

    const result = (await updateRecordAction.run(context)) as any;

    validateWrapperCall(context);
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
      [
        { id: 1, primary: true, name: 'id' },
        { id: 2, primary: false, name: 'field1' },
      ],
    );
    expect(openopsCommonMock.updateRow).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.updateRow).toHaveBeenCalledWith({
      tableId: 1,
      token: 'some databaseToken',
      rowId: 1,
      fields: { field1: 'new value' },
    });
  });

  test('should create record if doesnt exist', async () => {
    cacheWrapperMock.getOrAdd.mockReturnValueOnce(1).mockReturnValue([
      { id: 1, primary: true, name: 'id' },
      { id: 2, primary: false, name: 'field1' },
    ]);
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
    });
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue(undefined);
    openopsCommonMock.addRow.mockResolvedValue('mock result');
    const context = createContext({
      tableName: 'Opportunity',
      rowPrimaryKey: { rowPrimaryKey: 'some primary key value' },
      fieldsProperties: [
        {
          fieldName: 'field1',
          newFieldValue: { newFieldValue: 'new value' },
        },
      ],
    });

    const result = (await updateRecordAction.run(context)) as any;

    validateWrapperCall(context);
    expect(result).toBe('mock result');
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getRowByPrimaryKeyValue).toHaveBeenCalledWith(
      'some databaseToken',
      1,
      'some primary key value',
      'primary key field',
    );
    expect(openopsCommonMock.updateRow).not.toHaveBeenCalled();
    expect(
      openopsCommonMock.getPrimaryKeyFieldFromFields,
    ).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getPrimaryKeyFieldFromFields).toHaveBeenCalledWith(
      [
        { id: 1, primary: true, name: 'id' },
        { id: 2, primary: false, name: 'field1' },
      ],
    );
    expect(openopsCommonMock.addRow).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.addRow).toHaveBeenCalledWith({
      tableId: 1,
      token: 'some databaseToken',
      fields: {
        'primary key field': 'some primary key value',
        field1: 'new value',
      },
    });
  });

  test('should fail to add field if column does not exist', async () => {
    openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
      name: 'primary key field',
    });
    openopsCommonMock.getRowByPrimaryKeyValue.mockResolvedValue({ id: 1 });
    cacheWrapperMock.getOrAdd
      .mockReturnValueOnce(1)
      .mockReturnValue([{ id: 1, primary: true, name: 'id' }]);

    openopsCommonMock.updateRow.mockResolvedValue('mock result');
    const context = createContext({
      tableName: 'Opportunity',
      rowPrimaryKey: { rowPrimaryKey: 'some primary key value' },
      fieldsProperties: [
        {
          fieldName: 'field1',
          newFieldValue: { newFieldValue: 'new value' },
        },
      ],
    });

    await expect(updateRecordAction.run(context)).rejects.toThrow(
      'Column field1 does not exist in table Opportunity.',
    );

    expect(openopsCommonMock.updateRow).not.toHaveBeenCalled();
    expect(openopsCommonMock.getRowByPrimaryKeyValue).not.toHaveBeenCalled();
    expect(openopsCommonMock.getRowByPrimaryKeyValue).not.toHaveBeenCalled();
    expect(
      openopsCommonMock.getPrimaryKeyFieldFromFields,
    ).not.toHaveBeenCalled();
    expect(
      openopsCommonMock.getPrimaryKeyFieldFromFields,
    ).not.toHaveBeenCalled();
  });

  test.each([[[]], [{}]])(
    'should throw if the primary key is not a valid string',
    async (rowPrimaryKey: any) => {
      cacheWrapperMock.getOrAdd.mockReturnValueOnce(1).mockReturnValue([
        { id: 1, primary: true, name: 'id' },
        { id: 2, primary: false, name: 'field1' },
      ]);
      openopsCommonMock.getPrimaryKeyFieldFromFields.mockReturnValue({
        name: 'primary key field',
      });
      const context = createContext({
        tableName: 'Opportunity',
        rowPrimaryKey: { rowPrimaryKey: rowPrimaryKey },
        fieldsProperties: [
          {
            fieldName: 'field1',
            newFieldValue: { newFieldValue: 'new value' },
          },
        ],
      });

      await expect(updateRecordAction.run(context)).rejects.toThrow(
        'The primary key should be a string',
      );

      expect(openopsCommonMock.getRowByPrimaryKeyValue).not.toHaveBeenCalled();
      expect(openopsCommonMock.updateRow).not.toHaveBeenCalled();
      expect(openopsCommonMock.addRow).not.toHaveBeenCalled();
      expect(
        openopsCommonMock.getPrimaryKeyFieldFromFields,
      ).toHaveBeenCalledTimes(1);
      expect(
        openopsCommonMock.getPrimaryKeyFieldFromFields,
      ).toHaveBeenCalledWith([
        { id: 1, primary: true, name: 'id' },
        { id: 2, primary: false, name: 'field1' },
      ]);
    },
  );

  test('should not display fields that are read only or primary', async () => {
    openopsCommonMock.getTableFields.mockResolvedValue([
      { name: '1', primary: true },
      { name: '2', read_only: true },
      { name: '3', primary: false, read_only: false },
    ]);
    const context = createContext({ tableName: 'Opportunity' });

    const result = await updateRecordAction.props['fieldsProperties'].props(
      { tableName: 'Opportunity' } as DynamicPropsValue,
      context,
    );
    const prop = result['fieldsProperties'] as any;

    expect(prop['properties']['fieldName']['options']['options']).toEqual([
      {
        label: '3',
        value: '3',
      },
    ]);
  });
});

describe('fieldsProperties property', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fieldsProperties should have correct properties', async () => {
    const context = createContext();

    const result = await updateRecordAction.props['fieldsProperties'].props(
      { tableName: 'Opportunity' } as DynamicPropsValue,
      context,
    );

    expect(result['fieldsProperties']).toMatchObject({
      displayName: 'Fields to update',
      type: 'ARRAY',
      valueSchema: undefined,
      properties: {
        fieldName: {
          displayName: 'Field name',
          required: true,
          valueSchema: undefined,
        },
        newFieldValue: {
          displayName: 'New field value',
          required: true,
          valueSchema: undefined,
          type: 'DYNAMIC',
        },
      },
    });
    expect(openopsCommonMock.getTableFields).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getTableFields).toHaveBeenCalledWith(
      'Opportunity',
    );
  });
});

function validateWrapperCall(context: any) {
  expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledTimes(2);
  expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
    1,
    `${context.run.id}-table-${context.propsValue.tableName}`,
    getTableIdByTableName,
    [context.propsValue.tableName],
  );
  expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
    2,
    `${context.run.id}-1-fields`,
    getFields,
    [1, 'some databaseToken'],
  );
}

interface ContextParams {
  tableName?: string;
  rowPrimaryKey?: { rowPrimaryKey: string };
  fieldsProperties?: { fieldName: string; newFieldValue: any }[];
}

function createContext(params?: ContextParams) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    propsValue: {
      tableName: params?.tableName ?? 'Opportunity',
      rowPrimaryKey: params?.rowPrimaryKey ?? {
        rowPrimaryKey: 'default primary key',
      },
      fieldsProperties: { fieldsProperties: params?.fieldsProperties },
    },
    run: {
      id: nanoid(),
    },
  };
}
