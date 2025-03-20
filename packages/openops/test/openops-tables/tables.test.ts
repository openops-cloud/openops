const authenticateDefaultUserInOpenOpsTablesMock = jest.fn();
const makeOpenOpsTablesGetMock = jest.fn();
const createAxiosHeadersMock = jest.fn();

jest.mock('../../src/lib/openops-tables/requests-helpers', () => ({
  makeOpenOpsTablesGet: makeOpenOpsTablesGetMock,
  createAxiosHeaders: createAxiosHeadersMock,
}));

jest.mock('../../src/lib/openops-tables/auth-user', () => ({
  authenticateDefaultUserInOpenOpsTables:
    authenticateDefaultUserInOpenOpsTablesMock,
}));

jest.mock('../../src/lib/openops-tables/applications-service', () => ({
  getDefaultDatabaseId: jest.fn().mockResolvedValue(1),
}));

import {
  getTableByName,
  getTableIdByTableName,
  getTableNames,
} from '../../src/lib/openops-tables/tables';

describe('get table names', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateDefaultUserInOpenOpsTablesMock.mockResolvedValue({
      token: 'token',
    });
  });

  test('should return the list of available table names', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { id: 1, name: 'table name 1' },
      { id: 2, name: 'table name 2' },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableNames();

    expect(result[0]).toBe('table name 1');
    expect(result[1]).toBe('table name 2');
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('should return the list of available table names in a flatten list', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      [
        { id: 1, name: 'table name' },
        { id: 2, name: 'table name2' },
      ],
      [{ id: 3, name: 'table name3' }],
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableNames();

    expect(result).toStrictEqual(['table name', 'table name2', 'table name3']);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('should return the list of distinct table names', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      [
        { id: 2, name: 'table name' },
        { id: 1, name: 'table name' },
      ],
      [{ id: 3, name: 'table name3' }],
      [{ id: 4, name: 'Table Name' }],
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableNames();

    expect(result).toStrictEqual(['table name', 'table name3', 'Table Name']);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('get table id by table name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateDefaultUserInOpenOpsTablesMock.mockResolvedValue({
      token: 'token',
    });
  });

  test('should return the right table id', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { id: 12, name: 'table name 2' },
      { id: 1, name: 'table name' },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableIdByTableName('table name');

    expect(result).toBe(1);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('should throw an error if the table name is not found', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([{ id: 1, name: 'table name' }]);
    createAxiosHeadersMock.mockReturnValue('some header');

    await expect(getTableIdByTableName('table name 2')).rejects.toThrow(
      "Table 'table name 2' not found",
    );

    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('should return the lowest table id when multiple tables have the same name', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { id: 12, name: 'table name' },
      { id: 11, name: 'Table Name' },
      { id: 1, name: 'table name' },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableIdByTableName('table name');

    expect(result).toBe(1);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('get table by table name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authenticateDefaultUserInOpenOpsTablesMock.mockResolvedValue({
      token: 'token',
    });
  });

  test('should return the right table', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { id: 12, name: 'table name 2' },
      { id: 1, name: 'table name' },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableByName('table name');

    expect(result).toStrictEqual({ id: 1, name: 'table name' });
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('should return undefined if table was not found', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([{ id: 1, name: 'table name' }]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableByName('table name1');

    expect(result).toBe(undefined);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('should return the lowest table when multiple tables have the same name', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { id: 12, name: 'table name' },
      { id: 11, name: 'Table Name' },
      { id: 1, name: 'table name' },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getTableByName('table name');

    expect(result).toStrictEqual({ id: 1, name: 'table name' });
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/tables/database/1/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});
