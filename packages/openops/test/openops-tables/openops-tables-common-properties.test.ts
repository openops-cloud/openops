const getTableNamesFromContextMock = jest.fn();
const getTableFieldsFromContextMock = jest.fn();
jest.mock('../../src/lib/openops-tables/tables', () => {
  return {
    getTableNamesFromContext: getTableNamesFromContextMock,
  };
});
jest.mock('../../src/lib/openops-tables/fields', () => {
  return {
    getTableFieldsFromContext: getTableFieldsFromContextMock,
  };
});

import {
  DurationOpenOpsField,
  NumberOpenOpsField,
  SelectOpenOpsField,
} from '../../src/lib/openops-tables/fields';
import {
  getTableFields,
  openopsTablesDropdownProperty,
} from '../../src/lib/openops-tables/openops-tables-common-properties';

describe('table property', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return dropdown with all tables', async () => {
    const mockContext = {
      server: { tablesDatabaseId: 1, tablesDatabaseToken: 'encrypted-token' },
    } as any;
    getTableNamesFromContextMock.mockResolvedValue(['table1', 'table2']);

    const result = await openopsTablesDropdownProperty().options(
      null,
      mockContext,
    );

    expect(result).toMatchObject({
      disabled: false,
      options: [
        { label: 'table1', value: 'table1' },
        { label: 'table2', value: 'table2' },
      ],
    });
    expect(getTableNamesFromContextMock).toHaveBeenCalledTimes(1);
  });

  test('should handle empty tables', async () => {
    const mockContext = {
      server: { tablesDatabaseId: 1, tablesDatabaseToken: 'encrypted-token' },
    } as any;
    getTableNamesFromContextMock.mockResolvedValue([]);

    const result = await openopsTablesDropdownProperty().options(
      null,
      mockContext,
    );

    expect(result).toMatchObject({
      disabled: false,
      options: [],
    });
    expect(getTableNamesFromContextMock).toHaveBeenCalledTimes(1);
  });
});

describe('getTableFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the options', async () => {
    const mockContext = {
      server: { tablesDatabaseId: 1, tablesDatabaseToken: 'encrypted-token' },
    } as any;
    getTableFieldsFromContextMock.mockResolvedValue([
      {
        name: 'field1',
        id: 1,
        description: 'a description',
        primary: true,
        read_only: false,
        type: 'equal',
      },
      {
        name: 'field2',
        id: 2,
        description: 'another description',
        primary: false,
        read_only: false,
        type: 'equal',
      },
    ]);

    const result = await getTableFields('Opportunity', mockContext);

    expect(result).toMatchObject([
      {
        name: 'field1',
        id: 1,
        description: 'a description',
        primary: true,
        read_only: false,
        type: 'equal',
      },
      {
        name: 'field2',
        id: 2,
        description: 'another description',
        primary: false,
        read_only: false,
        type: 'equal',
      },
    ]);
    expect(getTableFieldsFromContextMock).toHaveBeenCalledTimes(1);
    expect(getTableFieldsFromContextMock).toHaveBeenCalledWith(
      'Opportunity',
      mockContext,
      undefined,
    );
  });

  test('should handle empty fields', async () => {
    const mockContext = {
      server: { tablesDatabaseId: 1, tablesDatabaseToken: 'encrypted-token' },
    } as any;
    getTableFieldsFromContextMock.mockResolvedValue([]);

    const result = await getTableFields('Opportunity', mockContext);

    expect(result).toMatchObject([]);
    expect(getTableFieldsFromContextMock).toHaveBeenCalledTimes(1);
    expect(getTableFieldsFromContextMock).toHaveBeenCalledWith(
      'Opportunity',
      mockContext,
      undefined,
    );
  });

  test('should return our supported properties for the field', async () => {
    const mockContext = {
      server: { tablesDatabaseId: 1, tablesDatabaseToken: 'encrypted-token' },
    } as any;
    const numberField: NumberOpenOpsField = {
      name: 'field1',
      id: 1,
      description: 'a description1',
      primary: true,
      read_only: false,
      type: 'number',
      number_negative: false,
    };
    const singleSelectField: SelectOpenOpsField = {
      name: 'field2',
      id: 2,
      description: 'a description2',
      primary: true,
      read_only: false,
      type: 'single_select',
      select_options: [{ id: 1, value: 'option1', color: 'red' }],
    };
    const multiSelectField: SelectOpenOpsField = {
      name: 'field3',
      id: 3,
      description: 'a description3',
      primary: true,
      read_only: false,
      type: 'multi_select',
      select_options: [{ id: 2, value: 'option2', color: 'green' }],
    };
    const durationField: DurationOpenOpsField = {
      name: 'field4',
      id: 4,
      description: 'a description4',
      primary: true,
      read_only: false,
      type: 'duration',
      duration_format: 'format',
    };

    getTableFieldsFromContextMock.mockResolvedValue([
      numberField,
      singleSelectField,
      multiSelectField,
      durationField,
    ]);

    const result = await getTableFields('Opportunity', mockContext);

    expect(result).toEqual([
      numberField,
      singleSelectField,
      multiSelectField,
      durationField,
    ]);
  });
});
