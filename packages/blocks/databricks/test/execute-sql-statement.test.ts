import { makeHttpRequest } from '@openops/common';
import { executeSqlStatement } from '../src/lib/actions/execute-sql-statement';
import { getDatabricksToken } from '../src/lib/common/get-databricks-token';
import { DatabricksSqlExecutionResult } from '../src/lib/common/sql-execution-result';

jest.mock('@openops/common', () => ({
  makeHttpRequest: jest.fn(),
}));

jest.mock('../src/lib/common/get-databricks-token', () => ({
  getDatabricksToken: jest.fn().mockResolvedValue('fake-token'),
}));

const mockedHttpRequest = makeHttpRequest as jest.Mock;

const auth = {
  accountId: 'test-account-id',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

const propsValue = {
  workspaceDeploymentName: 'workspace-test',
  warehouseId: 'warehouse-1',
  sqlText: 'SELECT * FROM test_table',
  parameters: { name: 'test' },
  timeout: 30,
};

const successResult = {
  statement_id: 'stmt-123',
  status: { state: 'SUCCEEDED' },
} as DatabricksSqlExecutionResult;

const pendingResult = {
  statement_id: 'stmt-456',
  status: { state: 'PENDING' },
} as DatabricksSqlExecutionResult;

describe('executeSqlStatement', () => {
  beforeEach(() => {
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((fn: (...args: any[]) => void) => {
        Promise.resolve().then(fn);
        return 0 as unknown as NodeJS.Timeout;
      });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should execute SQL and return result without polling when timeout <= 50s', async () => {
    mockedHttpRequest.mockResolvedValueOnce(successResult);

    const result = await executeSqlStatement.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue,
    });

    expect(getDatabricksToken).toHaveBeenCalledWith(auth);
    expect(makeHttpRequest).toHaveBeenCalledWith(
      'POST',
      'https://workspace-test.cloud.databricks.com/api/2.0/sql/statements',
      expect.anything(),
      expect.objectContaining({
        statement: 'SELECT * FROM test_table',
        warehouse_id: 'warehouse-1',
        wait_timeout: '30s',
        parameters: [{ name: 'name', value: 'test' }],
      }),
    );

    expect(result).toEqual(successResult);
  });

  test('should poll for result when timeout > 50s and initial status is PENDING', async () => {
    const longTimeout = 80;
    const propsWithLongTimeout = { ...propsValue, timeout: longTimeout };

    mockedHttpRequest
      .mockResolvedValueOnce(pendingResult)
      .mockResolvedValueOnce(successResult);

    const result = await executeSqlStatement.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue: propsWithLongTimeout,
    });

    expect(makeHttpRequest).toHaveBeenCalledTimes(2);
    expect(result).toEqual(successResult);
  });

  test('should poll more then 2 times for result when timeout > 50s and initial status is PENDING', async () => {
    const longTimeout = 90;
    const propsWithLongTimeout = { ...propsValue, timeout: longTimeout };

    mockedHttpRequest
      .mockResolvedValueOnce(pendingResult)
      .mockResolvedValueOnce(pendingResult)
      .mockResolvedValueOnce(successResult);

    const result = await executeSqlStatement.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue: propsWithLongTimeout,
    });

    expect(makeHttpRequest).toHaveBeenCalledTimes(3);
    expect(result).toEqual(successResult);
  }, 16000);

  test('should return initial result if state is not PENDING or RUNNING and timeout > 50s', async () => {
    const nonPendingResponse = {
      statement_id: 'stmt-789',
      status: { state: 'FAILED' },
      manifest: {},
      result: {},
    } as DatabricksSqlExecutionResult;

    mockedHttpRequest.mockResolvedValue(nonPendingResponse);

    const result = await executeSqlStatement.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue: { ...propsValue, timeout: 100 },
    });

    expect(result).toEqual(nonPendingResponse);
    expect(makeHttpRequest).toHaveBeenCalledTimes(1);
  });

  test('should return initial result if timeout exceed', async () => {
    const longTimeout = 60;
    const propsWithLongTimeout = { ...propsValue, timeout: longTimeout };

    mockedHttpRequest.mockResolvedValue(pendingResult);

    const result = await executeSqlStatement.run({
      ...jest.requireActual('@openops/blocks-framework'),
      auth,
      propsValue: propsWithLongTimeout,
    });

    expect(makeHttpRequest).toHaveBeenCalledTimes(2);
    expect(result).toEqual(pendingResult);
  });
});
