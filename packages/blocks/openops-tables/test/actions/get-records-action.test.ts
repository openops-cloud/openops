const cacheWrapperMock = {
  getSerializedObject: jest.fn(),
  setSerializedObject: jest.fn(),
  getOrAdd: jest.fn().mockReturnValue(123),
};

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  cacheWrapper: cacheWrapperMock,
}));

const openopsCommonMock = {
  ...jest.requireActual('@openops/common'),
  isSingleValueFilter: jest.fn(),
  getPropertyFromField: jest.fn(),
  authenticateDefaultUserInOpenOpsTables: jest.fn(),
  getRows: jest.fn(),
  getTableFields: jest.fn().mockResolvedValue([
    {
      name: 'mock options',
      description: 'some description',
      primary: false,
      read_only: false,
      type: 'text',
    },
  ]),
  openopsTablesDropdownProperty: jest.fn().mockReturnValue({
    required: true,
    defaultValue: false,
    type: 'DROPDOWN',
  }),
};

jest.mock('@openops/common', () => openopsCommonMock);
import { DynamicPropsValue } from '@openops/blocks-framework';
import {
  FilterType,
  getTableIdByTableName,
  ViewFilterTypesEnum,
} from '@openops/common';
import { nanoid } from 'nanoid';
import { getRecordsAction } from '../../src/actions/get-records-action';

describe('getRecordsAction test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(getRecordsAction.props).toMatchObject({
      tableName: {
        required: true,
        type: 'DROPDOWN',
      },
      filterType: {
        required: false,
        type: 'STATIC_DROPDOWN',
      },
      filters: {
        type: 'DYNAMIC',
        required: true,
      },
    });
  });

  describe('filters property', () => {
    test('filters should have correct properties', async () => {
      const context = createContext();

      const result = await getRecordsAction.props['filters'].props(
        { tableName: 'Opportunity' } as DynamicPropsValue,
        context,
      );

      expect(result['filters']).toMatchObject({
        displayName: 'Fields to filter by',
        type: 'ARRAY',
        properties: {
          fieldName: {
            displayName: 'Field name',
            required: true,
          },
          value: {
            displayName: 'Value to search for',
            required: true,
            type: 'DYNAMIC',
          },
          filterType: {
            displayName: 'Filter type',
            required: true,
            type: 'STATIC_DROPDOWN',
          },
        },
      });
      expect(openopsCommonMock.getTableFields).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getTableFields).toHaveBeenCalledWith(
        'Opportunity',
      );
    });
  });

  test('should authenticate', async () => {
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });
    openopsCommonMock.getRows.mockResolvedValue([]);
    const context = createContext();

    const result = (await getRecordsAction.run(context)) as any;

    validateWrapperCall(context);
    expect(result).toStrictEqual({ items: [], count: 0 });
    expect(
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
    ).toHaveBeenCalledTimes(1);
    expect(
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables,
    ).toHaveBeenCalledWith();
  });

  test('should get row with the given filters', async () => {
    openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'some databaseToken',
    });
    openopsCommonMock.getRows.mockResolvedValue([{ id: 1, name: 'row1' }]);
    const context = createContext({
      tableName: 'Opportunity',
      filterType: FilterType.AND,
      filters: [
        {
          fieldName: 'field name',
          value: { value: 'value' },
          filterType: 'some filter type',
        },
      ],
    });

    const result = (await getRecordsAction.run(context)) as any;

    validateWrapperCall(context);
    expect(result).toStrictEqual({
      items: [{ id: 1, name: 'row1' }],
      count: 1,
    });
    expect(openopsCommonMock.getRows).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getRows).toHaveBeenCalledWith({
      tableId: 123,
      token: 'some databaseToken',
      filters: [
        {
          fieldName: 'field name',
          value: 'value',
          type: 'some filter type',
        },
      ],
      filterType: FilterType.AND,
    });
  });

  test('should return the empty obj value when the selected filter is single value', async () => {
    openopsCommonMock.isSingleValueFilter.mockReturnValue(true);

    const context = createContext();
    const filtersDynamicProp: DynamicPropsValue = await getRecordsAction.props[
      'filters'
    ].props({ tableName: 'Opportunity' } as DynamicPropsValue, context);
    const valueProperty = filtersDynamicProp['filters'].properties[
      'value'
    ] as DynamicPropsValue;

    const result = await valueProperty['props'](
      {
        fieldName: 'field name',
        filterType: 'some filter type',
      },
      context,
    );

    expect(result).toMatchObject({
      value: {},
    });

    expect(openopsCommonMock.isSingleValueFilter).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.isSingleValueFilter).toHaveBeenCalledWith(
      'some filter type',
    );
    expect(openopsCommonMock.getPropertyFromField).not.toHaveBeenCalled();
  });

  test('should return the field value when the selected filter is not single value', async () => {
    openopsCommonMock.isSingleValueFilter.mockReturnValue(false);
    openopsCommonMock.getPropertyFromField.mockReturnValue('field value');

    const context = createContext();
    const filtersDynamicProp: DynamicPropsValue = await getRecordsAction.props[
      'filters'
    ].props({ tableName: 'Opportunity' } as DynamicPropsValue, context);
    const valueProperty = filtersDynamicProp['filters'].properties[
      'value'
    ] as DynamicPropsValue;

    const result = await valueProperty['props'](
      {
        fieldName: 'mock options',
        filterType: 'some filter type',
      },
      context,
    );

    expect(result).toMatchObject({
      value: 'field value',
    });

    expect(openopsCommonMock.isSingleValueFilter).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.isSingleValueFilter).toHaveBeenCalledWith(
      'some filter type',
    );
    expect(openopsCommonMock.getPropertyFromField).toHaveBeenCalledTimes(1);
    expect(openopsCommonMock.getPropertyFromField).toHaveBeenCalledWith(
      {
        name: 'mock options',
        type: 'text',
        primary: false,
        description: 'some description',
        read_only: false,
      },
      true,
    );
  });

  test.each([
    [ViewFilterTypesEnum.equal, '', ViewFilterTypesEnum.empty],
    [ViewFilterTypesEnum.equal, null, ViewFilterTypesEnum.empty],
    [ViewFilterTypesEnum.equal, undefined, ViewFilterTypesEnum.empty],
    [ViewFilterTypesEnum.not_equal, '', ViewFilterTypesEnum.not_empty],
    [ViewFilterTypesEnum.not_equal, null, ViewFilterTypesEnum.not_empty],
    [ViewFilterTypesEnum.not_equal, undefined, ViewFilterTypesEnum.not_empty],
  ])(
    'should replace field filter=%p with %p when the value is empty',
    async (originalFilter, emptyFieldValue, expectedNewFilter) => {
      openopsCommonMock.authenticateDefaultUserInOpenOpsTables.mockResolvedValue(
        { token: 'some databaseToken' },
      );
      openopsCommonMock.getRows.mockResolvedValue([{ id: 1, name: 'row1' }]);

      const context = createContext({
        tableName: 'Opportunity',
        filterType: FilterType.AND,
        filters: [
          {
            fieldName: 'a',
            value: {
              value:
                'should not replace this filter type because value is not empty',
            },
            filterType: originalFilter,
          },
          {
            fieldName: 'this will be replaced',
            value: { value: emptyFieldValue },
            filterType: originalFilter,
          },
          {
            fieldName: 'b',
            value: { value: emptyFieldValue },
            filterType:
              'should not replace this filter type because the filter is not equal or not equal',
          },
        ],
      });

      const result = (await getRecordsAction.run(context)) as any;
      expect(result).toStrictEqual({
        items: [{ id: 1, name: 'row1' }],
        count: 1,
      });

      validateWrapperCall(context);
      expect(openopsCommonMock.getRows).toHaveBeenCalledTimes(1);
      expect(openopsCommonMock.getRows).toHaveBeenCalledWith({
        tableId: 123,
        token: 'some databaseToken',
        filters: [
          {
            fieldName: 'a',
            value:
              'should not replace this filter type because value is not empty',
            type: originalFilter,
          },
          {
            fieldName: 'this will be replaced',
            value: emptyFieldValue,
            type: expectedNewFilter,
          },
          {
            fieldName: 'b',
            value: emptyFieldValue,
            type: 'should not replace this filter type because the filter is not equal or not equal',
          },
        ],
        filterType: FilterType.AND,
      });
    },
  );
});

function validateWrapperCall(context: any) {
  expect(cacheWrapperMock.getOrAdd).toHaveBeenCalledTimes(1);
  expect(cacheWrapperMock.getOrAdd).toHaveBeenNthCalledWith(
    1,
    `${context.run.id}-table-${context.propsValue.tableName}`,
    getTableIdByTableName,
    [context.propsValue.tableName],
  );
}

interface ContextParams {
  tableName?: string;
  filterType?: string;
  filters?: { fieldName: string; value: any; filterType: string }[];
}

function createContext(params?: ContextParams) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    propsValue: {
      tableName: params?.tableName ?? 'Opportunity',
      filterType: params?.filterType,
      filters: { filters: params?.filters || [] },
    },
    run: {
      id: nanoid(),
    },
  };
}
