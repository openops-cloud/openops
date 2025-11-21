const getTableNames = jest.fn();
const getTableFieldsFromContextMock = jest.fn();
const getTableIdByTableName = jest.fn();
const getFields = jest.fn();
const authenticateDefaultUserInOpenOpsTables = jest.fn();

jest.mock('../../src/lib/openops-tables/tables', () => {
  return {
    getTableNames: getTableNames,
    getTableIdByTableName: getTableIdByTableName,
  };
});
jest.mock('../../src/lib/openops-tables/fields', () => {
  return {
    getTableFieldsFromContext: getTableFieldsFromContextMock,
    getFields: getFields,
  };
});
jest.mock('../../src/lib/openops-tables/auth-user', () => {
  return {
    authenticateDefaultUserInOpenOpsTables:
      authenticateDefaultUserInOpenOpsTables,
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
    };
    getTableNames.mockResolvedValue(['table1', 'table2']);

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
    expect(getTableNames).toHaveBeenCalledTimes(1);
  });

  test('should handle empty tables', async () => {
    const mockContext = {
      server: { tablesDatabaseId: 1, tablesDatabaseToken: 'encrypted-token' },
    };
    getTableNames.mockResolvedValue([]);

    const result = await openopsTablesDropdownProperty().options(
      null,
      mockContext,
    );

    expect(result).toMatchObject({
      disabled: false,
      options: [],
    });
    expect(getTableNames).toHaveBeenCalledTimes(1);
  });
});

describe('getTableFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the options', async () => {
    authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'mock-token',
      refresh_token: 'mock-refresh-token',
    });
    getTableIdByTableName.mockResolvedValue(123);
    getFields.mockResolvedValue([
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

    const result = await getTableFields('Opportunity');

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
    expect(authenticateDefaultUserInOpenOpsTables).toHaveBeenCalledTimes(1);
    expect(getTableIdByTableName).toHaveBeenCalledWith('Opportunity');
    expect(getFields).toHaveBeenCalledWith(123, 'mock-token', false, undefined);
  });

  test('should handle empty fields', async () => {
    authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'mock-token',
      refresh_token: 'mock-refresh-token',
    });
    getTableIdByTableName.mockResolvedValue(123);
    getFields.mockResolvedValue([]);

    const result = await getTableFields('Opportunity');

    expect(result).toMatchObject([]);
    expect(authenticateDefaultUserInOpenOpsTables).toHaveBeenCalledTimes(1);
    expect(getTableIdByTableName).toHaveBeenCalledWith('Opportunity');
    expect(getFields).toHaveBeenCalledWith(123, 'mock-token', false, undefined);
  });

  test('should return our supported properties for the field', async () => {
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

    authenticateDefaultUserInOpenOpsTables.mockResolvedValue({
      token: 'mock-token',
      refresh_token: 'mock-refresh-token',
    });
    getTableIdByTableName.mockResolvedValue(123);
    getFields.mockResolvedValue([
      numberField,
      singleSelectField,
      multiSelectField,
      durationField,
    ]);

    const result = await getTableFields('Opportunity');

    expect(result).toEqual([
      numberField,
      singleSelectField,
      multiSelectField,
      durationField,
    ]);
  });
});
