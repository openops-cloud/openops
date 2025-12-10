const getTableNamesMock = jest.fn();
const getTableIdByTableNameMock = jest.fn();
jest.mock('../../src/lib/openops-tables/tables', () => {
  return {
    getTableNames: getTableNamesMock,
    getTableIdByTableName: getTableIdByTableNameMock,
  };
});
const getFieldsMock = jest.fn();
jest.mock('../../src/lib/openops-tables/fields', () => {
  return { getFields: getFieldsMock };
});

import { EncryptedObject } from '@openops/shared';
import { TablesServerContext } from '../../src/lib/openops-tables/context-helpers';
import {
  DurationOpenOpsField,
  NumberOpenOpsField,
  SelectOpenOpsField,
} from '../../src/lib/openops-tables/fields';
import {
  getTableFields,
  openopsTablesDropdownProperty,
} from '../../src/lib/openops-tables/openops-tables-common-properties';

const mockTablesServerContext: TablesServerContext = {
  tablesDatabaseId: 1,
  tablesDatabaseToken: {
    iv: 'test-iv',
    data: 'test-data',
  } as EncryptedObject,
};

describe('table property', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return dropdown with all tables', async () => {
    getTableNamesMock.mockResolvedValue(['table1', 'table2']);

    const result = await openopsTablesDropdownProperty().options(undefined, {
      server: undefined,
    });

    expect(result).toMatchObject({
      disabled: false,
      options: [
        { label: 'table1', value: 'table1' },
        { label: 'table2', value: 'table2' },
      ],
    });

    expect(getTableNamesMock).toHaveBeenCalledTimes(1);
  });

  test('should handle empty tables', async () => {
    getTableNamesMock.mockResolvedValue([]);

    const result = await openopsTablesDropdownProperty().options(undefined, {
      server: undefined,
    });

    expect(result).toMatchObject({
      disabled: false,
      options: [],
    });
    expect(getTableNamesMock).toHaveBeenCalledTimes(1);
  });
});

describe('getTableFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the options', async () => {
    getFieldsMock.mockResolvedValue([
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

    getTableIdByTableNameMock.mockResolvedValue(1);

    const result = await getTableFields('Opportunity', mockTablesServerContext);

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

    expect(getFieldsMock).toHaveBeenCalledTimes(1);
    expect(getFieldsMock).toHaveBeenCalledWith(
      1,
      {
        getToken: expect.any(Function),
      },
      false,
    );
  });

  test('should handle empty fields', async () => {
    getFieldsMock.mockResolvedValue([]);
    getTableIdByTableNameMock.mockResolvedValue(1);

    const result = await getTableFields('Opportunity', mockTablesServerContext);

    expect(result).toMatchObject([]);

    expect(getFieldsMock).toHaveBeenCalledTimes(1);
    expect(getFieldsMock).toHaveBeenCalledWith(
      1,
      {
        getToken: expect.any(Function),
      },
      false,
    );
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

    getFieldsMock.mockResolvedValue([
      numberField,
      singleSelectField,
      multiSelectField,
      durationField,
    ]);
    getTableIdByTableNameMock.mockResolvedValue(2);

    const result = await getTableFields('Opportunity', mockTablesServerContext);

    expect(result).toEqual([
      numberField,
      singleSelectField,
      multiSelectField,
      durationField,
    ]);
  });
});
