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

import { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';
import {
  FilterType,
  ViewFilterTypesEnum,
} from '../../src/lib/openops-tables/filters';
import {
  axiosTablesBadGatewayRetryConfig,
  RETRY_DELAY_MS,
} from '../../src/lib/openops-tables/requests-helpers';
import {
  addRow,
  deleteRow,
  getRowByPrimaryKeyValue,
  getRows,
  OpenOpsRow,
  updateRow,
} from '../../src/lib/openops-tables/rows';

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
      axiosTablesBadGatewayRetryConfig,
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
      axiosTablesBadGatewayRetryConfig,
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
      axiosTablesBadGatewayRetryConfig,
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
      axiosTablesBadGatewayRetryConfig,
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
      axiosTablesBadGatewayRetryConfig,
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
      axiosTablesBadGatewayRetryConfig,
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
        axiosTablesBadGatewayRetryConfig,
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
        axiosTablesBadGatewayRetryConfig,
      );
      expect(createAxiosHeadersMock).toBeCalledTimes(1);
      expect(createAxiosHeadersMock).toHaveBeenCalledWith('token');
    },
  );
});

describe('axiosTablesBadGatewayRetryConfig', () => {
  test('Should have correct retry configuration', () => {
    expect(axiosTablesBadGatewayRetryConfig.retries).toBe(3);
    expect(typeof axiosTablesBadGatewayRetryConfig.retryDelay).toBe('function');
    expect(typeof axiosTablesBadGatewayRetryConfig.retryCondition).toBe(
      'function',
    );
  });

  test('Should retry on BAD_GATEWAY status', () => {
    const retryCondition = axiosTablesBadGatewayRetryConfig.retryCondition!;
    const mockAxiosError = {
      response: { status: StatusCodes.BAD_GATEWAY },
    } as AxiosError;

    expect(retryCondition(mockAxiosError)).toBe(true);
  });

  test('Should not retry on other status codes', () => {
    const retryCondition = axiosTablesBadGatewayRetryConfig.retryCondition!;
    const mockAxiosError = {
      response: { status: StatusCodes.INTERNAL_SERVER_ERROR },
    } as AxiosError;

    expect(retryCondition(mockAxiosError)).toBe(false);
  });

  test('Should not retry when no response status', () => {
    const retryCondition = axiosTablesBadGatewayRetryConfig.retryCondition!;
    const mockAxiosError = {
      response: undefined,
    } as AxiosError;

    expect(retryCondition(mockAxiosError)).toBe(false);
  });

  test('Should use RETRY_DELAY_MS in retryDelay calculation', () => {
    const retryDelay = axiosTablesBadGatewayRetryConfig.retryDelay!;
    const dummyError = {} as AxiosError;
    const retryCounts = [1, 2, 5, 10];
    for (const count of retryCounts) {
      expect(retryDelay(count, dummyError)).toBe(count * RETRY_DELAY_MS);
    }
  });
});
