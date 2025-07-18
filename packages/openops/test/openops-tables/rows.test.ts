const makeOpenOpsTablesGetMock = jest.fn();
const makeOpenOpsTablesPatchMock = jest.fn();
const makeOpenOpsTablesPostMock = jest.fn();
const makeOpenOpsTablesDeleteMock = jest.fn();
const createAxiosHeadersMock = jest.fn();

const actualRequestsHelpers = jest.requireActual(
  '../../src/lib/openops-tables/requests-helpers',
);

jest.mock('../../src/lib/openops-tables/requests-helpers', () => ({
  ...actualRequestsHelpers,
  makeOpenOpsTablesGet: makeOpenOpsTablesGetMock,
  makeOpenOpsTablesPatch: makeOpenOpsTablesPatchMock,
  makeOpenOpsTablesPost: makeOpenOpsTablesPostMock,
  makeOpenOpsTablesDelete: makeOpenOpsTablesDeleteMock,
  createAxiosHeaders: createAxiosHeadersMock,
}));

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    ...jest.requireActual('@openops/server-shared').logger,
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const acquireMock = jest.fn(async () => [null, releaseMock]);
const releaseMock = jest.fn();

jest.mock('async-mutex', () => {
  return {
    ...jest.requireActual('async-mutex'),
    Semaphore: jest.fn().mockImplementation(() => ({
      acquire: acquireMock,
    })),
  };
});

import { logger } from '@openops/server-shared';
import { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';
import {
  FilterType,
  ViewFilterTypesEnum,
} from '../../src/lib/openops-tables/filters';
import { axiosTablesRetryConfig } from '../../src/lib/openops-tables/requests-helpers';
import {
  addRow,
  deleteRow,
  getRowByPrimaryKeyValue,
  getRows,
  OpenOpsRow,
  updateRow,
} from '../../src/lib/openops-tables/rows';

const expectRetryConfig = expect.objectContaining({
  retries: 3,
  retryDelay: expect.any(Function),
  retryCondition: expect.any(Function),
});

describe('getRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should get rows with lock', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { results: [{ id: 1, order: 1234 }] },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await getRows({
      tableId: 1,
      token: 'token',
    });

    expect(result).toStrictEqual([{ id: 1, order: 1234 }]);
    expect(acquireMock).toBeCalledTimes(1);
    expect(releaseMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
  });

  test('Should get rows', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { results: [{ id: 1, order: 1234 }] },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await getRows({
      tableId: 1,
      token: 'token',
    })) as unknown as OpenOpsRow[];

    expect(result[0].id).toBe(1);
    expect(result[0].order).toBe(1234);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/rows/table/1/?user_field_names=true',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('Should work with filters', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      { results: [{ id: 1, order: 1234 }] },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await getRows({
      tableId: 1,
      token: 'token',
      filters: [
        {
          fieldName: 'name1',
          value: 'value field 1',
          type: ViewFilterTypesEnum.boolean,
        },
        { fieldName: 'name2', value: 2, type: ViewFilterTypesEnum.equal },
      ],
      filterType: FilterType.AND,
    })) as unknown as OpenOpsRow[];

    expect(result[0].id).toBe(1);
    expect(result[0].order).toBe(1234);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/rows/table/1/?user_field_names=true&filter__name1__boolean=value+field+1&filter__name2__equal=2&filter_type=AND',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });

  test('Should flatten list', async () => {
    makeOpenOpsTablesGetMock.mockResolvedValue([
      {
        nr: 1,
        results: [
          { id: 1, order: 1234 },
          { id: 3, order: 5 },
        ],
      },
      { nr: 2, results: [{ id: 2, order: 4321 }] },
    ]);
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await getRows({
      tableId: 1,
      token: 'token',
    })) as unknown as OpenOpsRow[];

    expect(result).toStrictEqual([
      { id: 1, order: 1234 },
      { id: 3, order: 5 },
      { id: 2, order: 4321 },
    ]);
    expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
      'api/database/rows/table/1/?user_field_names=true',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('update row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should update row with lock', async () => {
    makeOpenOpsTablesPatchMock.mockResolvedValue('mock result');
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await updateRow({
      tableId: 1,
      token: 'token',
      rowId: 2,
      fields: {
        'some field name one': 'value field1',
        'some field name two': 2,
      },
    });

    expect(result).toBe('mock result');
    expect(acquireMock).toBeCalledTimes(1);
    expect(releaseMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesPatchMock).toBeCalledTimes(1);
  });

  test('Should update row with usernames', async () => {
    makeOpenOpsTablesPatchMock.mockResolvedValue('mock result');
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await updateRow({
      tableId: 1,
      token: 'token',
      rowId: 2,
      fields: {
        'some field name one': 'value field1',
        'some field name two': 2,
      },
    })) as any;

    expect(result).toBe('mock result');
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    expect(makeOpenOpsTablesPatchMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesPatchMock).toHaveBeenCalledWith(
      'api/database/rows/table/1/2/?user_field_names=true',
      { 'some field name one': 'value field1', 'some field name two': 2 },
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('add row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should add row with lock', async () => {
    makeOpenOpsTablesPostMock.mockResolvedValue('mock result');
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await addRow({
      tableId: 1,
      token: 'token',
      fields: {
        'some field name one': 'value field1',
        'some field name two': 2,
      },
    });

    expect(result).toBe('mock result');
    expect(acquireMock).toBeCalledTimes(1);
    expect(releaseMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesPostMock).toBeCalledTimes(1);
  });

  test('Should add row with usernames', async () => {
    makeOpenOpsTablesPostMock.mockResolvedValue('mock result');
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await addRow({
      tableId: 1,
      token: 'token',
      fields: {
        'some field name one': 'value field1',
        'some field name two': 2,
      },
    })) as any;

    expect(result).toBe('mock result');
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    expect(makeOpenOpsTablesPostMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesPostMock).toHaveBeenCalledWith(
      'api/database/rows/table/1/?user_field_names=true',
      { 'some field name one': 'value field1', 'some field name two': 2 },
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('delete row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Should delete row with lock', async () => {
    makeOpenOpsTablesDeleteMock.mockResolvedValue('mock result');
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = await deleteRow({
      tableId: 1,
      token: 'token',
      rowId: 2,
    });

    expect(result).toBe('mock result');
    expect(acquireMock).toBeCalledTimes(1);
    expect(releaseMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesDeleteMock).toBeCalledTimes(1);
  });

  test('Should delete row', async () => {
    makeOpenOpsTablesDeleteMock.mockResolvedValue('mock result');
    createAxiosHeadersMock.mockReturnValue('some header');

    const result = (await deleteRow({
      tableId: 1,
      token: 'token',
      rowId: 2,
    })) as any;

    expect(result).toBe('mock result');
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    expect(makeOpenOpsTablesDeleteMock).toBeCalledTimes(1);
    expect(makeOpenOpsTablesDeleteMock).toHaveBeenCalledWith(
      'api/database/rows/table/1/2/',
      'some header',
    );
    expect(createAxiosHeadersMock).toBeCalledTimes(1);
    expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
  });
});

describe('getRowByPrimaryKeyValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ['text', 'equal'],
    ['rating', 'equal'],
    ['email', 'equal'],
    ['date', 'date_equal'],
  ])(
    'Should get row by primary key value',
    async (fieldType: string, expected: string) => {
      makeOpenOpsTablesGetMock.mockResolvedValue([
        { results: [{ id: 1, order: 1234 }] },
      ]);
      createAxiosHeadersMock.mockReturnValue('some header');

      const result = await getRowByPrimaryKeyValue(
        'token',
        1,
        'primaryKeyValue',
        'primaryFieldName',
        fieldType,
      );

      expect(result).toStrictEqual({ id: 1, order: 1234 });
      expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
      expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
        `api/database/rows/table/1/?user_field_names=true&filter__primaryFieldName__${expected}=primaryKeyValue`,
        'some header',
      );
      expect(createAxiosHeadersMock).toBeCalledTimes(1);
      expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    },
  );

  test.each([
    ['text', 'equal'],
    ['rating', 'equal'],
    ['email', 'equal'],
    ['date', 'date_equal'],
  ])(
    'should throw if more than one row was found',
    async (fieldType: string, expected: string) => {
      makeOpenOpsTablesGetMock.mockResolvedValue([
        {
          results: [
            { id: 1, order: 1234 },
            { id: 2, order: 1234 },
          ],
        },
      ]);
      createAxiosHeadersMock.mockReturnValue('some header');
      await expect(
        getRowByPrimaryKeyValue(
          'token',
          1,
          'primaryKeyValue',
          'primaryFieldName',
          fieldType,
        ),
      ).rejects.toThrow('More than one row found with given primary key');

      expect(makeOpenOpsTablesGetMock).toBeCalledTimes(1);
      expect(makeOpenOpsTablesGetMock).toHaveBeenCalledWith(
        `api/database/rows/table/1/?user_field_names=true&filter__primaryFieldName__${expected}=primaryKeyValue`,
        'some header',
      );
      expect(createAxiosHeadersMock).toBeCalledTimes(1);
      expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    },
  );
});

describe('axiosTablesRetryConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Should have correct retry configuration', () => {
    expect(axiosTablesRetryConfig.retries).toBe(3);
    expect(typeof axiosTablesRetryConfig.retryDelay).toBe('function');
    expect(typeof axiosTablesRetryConfig.retryCondition).toBe('function');
  });

  for (const { code, description } of [
    { code: StatusCodes.BAD_GATEWAY, description: 'Bad Gateway' },
    { code: StatusCodes.CONFLICT, description: 'Conflict' },
  ]) {
    test(`Should retry on status ${description}`, () => {
      const retryCondition = axiosTablesRetryConfig.retryCondition!;
      const mockAxiosError = {
        response: { status: code },
      } as AxiosError;

      expect(retryCondition(mockAxiosError)).toBe(true);
    });
  }

  test('Should not retry on other status codes', () => {
    const retryCondition = axiosTablesRetryConfig.retryCondition!;
    const mockAxiosError = {
      response: { status: StatusCodes.INTERNAL_SERVER_ERROR },
    } as AxiosError;

    expect(retryCondition(mockAxiosError)).toBe(false);
  });

  test('Should not retry when no response status', () => {
    const retryCondition = axiosTablesRetryConfig.retryCondition!;
    const mockAxiosError = {
      response: undefined,
    } as AxiosError;

    expect(retryCondition(mockAxiosError)).toBe(false);
  });

  test('Should log debug message with correct status text when retryDelay is called', () => {
    const retryDelay = axiosTablesRetryConfig.retryDelay!;
    const mockAxiosError = {
      response: { status: StatusCodes.BAD_GATEWAY },
    } as AxiosError;
    const retryCount = 2;

    retryDelay(retryCount, mockAxiosError);

    expect(logger.debug).toHaveBeenCalledWith(
      'The request failed with status 502 Bad Gateway. Request count: 2',
    );
  });

  test('Should log debug message with unknown status when no response status', () => {
    const retryDelay = axiosTablesRetryConfig.retryDelay!;
    const mockAxiosError = {
      response: undefined,
    } as AxiosError;
    const retryCount = 1;

    retryDelay(retryCount, mockAxiosError);

    expect(logger.debug).toHaveBeenCalledWith(
      'The request failed with status unknown status. Request count: 1',
    );
  });

  test('Should log debug message with correct status text for different status codes', () => {
    const retryDelay = axiosTablesRetryConfig.retryDelay!;
    const testCases = [
      { status: StatusCodes.CONFLICT, expected: '409 Conflict' },
      { status: StatusCodes.NOT_FOUND, expected: '404 Not Found' },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        expected: '500 Internal Server Error',
      },
    ];

    testCases.forEach(({ status, expected }) => {
      const mockAxiosError = {
        response: { status },
      } as AxiosError;
      const retryCount = 1;

      retryDelay(retryCount, mockAxiosError);

      expect(logger.debug).toHaveBeenCalledWith(
        `The request failed with status ${expected}. Request count: 1`,
      );
    });
  });
});
