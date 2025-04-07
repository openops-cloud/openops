/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionContext } from '@openops/blocks-framework';
import snowflakeSdk from 'snowflake-sdk';
import { runQuery } from '../src/lib/actions/run-query';
import {
  DEFAULT_APPLICATION_NAME,
  DEFAULT_QUERY_TIMEOUT,
} from '../src/lib/common/constants';
import { customAuth } from '../src/lib/common/custom-auth';

const mockConnect = jest.fn();
const mockExecute = jest.fn();
const mockDestroy = jest.fn();
const mockIsUp = jest.fn(() => true); // Default to 'up' after connect attempt

jest.mock('snowflake-sdk', () => ({
  createConnection: jest.fn(() => ({
    connect: mockConnect,
    execute: mockExecute,
    destroy: mockDestroy,
    isUp: mockIsUp,
  })),
}));

type ResolvedProps = {
  sqlText: string;
  binds: unknown[] | undefined;
  timeout: number;
  application: string;
};

type ResolvedAuth = {
  username: string;
  password: string;
  role: string;
  database: string;
  warehouse: string;
  account: string;
};

type RunQueryContext = Parameters<typeof runQuery.run>[0] & {
  logger: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
};

type MockPropsValueInput = Partial<Omit<ResolvedProps, 'binds'>> & {
  sqlText: string;
  binds?: unknown[];
};
type MockAuthInput = Partial<ResolvedAuth>;

const createMockContext = (
  propsValueInput: MockPropsValueInput,
  auth: MockAuthInput = {
    username: 'testuser',
    password: 'testpassword',
    role: 'testrole',
    database: 'testdb',
    warehouse: 'testwh',
    account: 'testaccount',
  },
): RunQueryContext => {
  const finalPropsValue = {
    application: DEFAULT_APPLICATION_NAME,
    timeout: DEFAULT_QUERY_TIMEOUT,
    useTransaction: false,
    binds: undefined,
    ...propsValueInput,
  };

  return {
    auth: auth as RunQueryContext['auth'],
    propsValue: finalPropsValue as RunQueryContext['propsValue'],
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  } as RunQueryContext;
};

describe('Snowflake: runQuery Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsUp.mockReturnValue(true);

    mockConnect.mockImplementation((callback) =>
      process.nextTick(() => callback(undefined)),
    );
    mockExecute.mockImplementation(({ complete }) =>
      process.nextTick(() => complete(undefined, {}, [])),
    );
    mockDestroy.mockImplementation((callback) => {
      mockIsUp.mockReturnValue(false); // Simulate connection going down
      process.nextTick(() => callback(undefined));
    });
  });

  it('should successfully execute a query and return rows', async () => {
    const propsInput: MockPropsValueInput = {
      sqlText: 'SELECT id, name FROM users WHERE id = ?',
      binds: [123],
    };
    const context = createMockContext(propsInput);
    const mockResultRows = [{ id: 123, name: 'Test User' }];

    mockExecute.mockImplementationOnce(({ complete }) => {
      process.nextTick(() => complete(undefined, {}, mockResultRows));
    });

    await expect(
      runQuery.run(
        context as ActionContext<typeof customAuth, typeof runQuery.props>,
      ),
    ).resolves.toEqual(mockResultRows);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        username: context.auth.username,
        password: context.auth.password,
        application: context.propsValue.application,
        timeout: context.propsValue.timeout,
      }),
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        sqlText: context.propsValue.sqlText,
        binds: context.propsValue.binds,
      }),
    );
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('should execute successfully when binds are not provided', async () => {
    const propsInput: MockPropsValueInput = {
      sqlText: 'SELECT 1',
    };
    const context = createMockContext(propsInput);

    await expect(
      runQuery.run(
        context as ActionContext<typeof customAuth, typeof runQuery.props>,
      ),
    ).resolves.toEqual([]);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        sqlText: context.propsValue.sqlText,
        binds: undefined,
      }),
    );
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('should use provided timeout and application name', async () => {
    const propsInput: MockPropsValueInput = {
      sqlText: 'SELECT 1',
      timeout: 10000,
      application: 'MyCustomApp',
    };
    const context = createMockContext(propsInput);

    await expect(
      runQuery.run(
        context as ActionContext<typeof customAuth, typeof runQuery.props>,
      ),
    ).resolves.toEqual([]);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 10000,
        application: 'MyCustomApp',
      }),
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  //TODO: Make this test pass
  it.skip('should reject if connection fails', async () => {
    const propsInput: MockPropsValueInput = { sqlText: 'SELECT 1' };
    const context = createMockContext(propsInput);
    const connectionError = new Error('Failed to connect');

    mockIsUp.mockReturnValue(false);
    mockConnect.mockImplementationOnce((callback) => {
      process.nextTick(() => callback(connectionError));
    });

    await expect(runQuery.run(context)).rejects.toThrow(connectionError);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('should reject if query execution fails', async () => {
    const propsInput: MockPropsValueInput = { sqlText: 'INVALID SYNTAX' };
    const context = createMockContext(propsInput);
    const executionError = new Error('SQL compilation error');

    mockExecute.mockImplementationOnce(({ complete }) => {
      process.nextTick(() => complete(executionError));
    });

    await expect(runQuery.run(context)).rejects.toThrow(executionError);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  //TODO: Make this test pass
  it.skip('should reject if destroy fails after successful execution', async () => {
    const propsInput: MockPropsValueInput = { sqlText: 'SELECT 1' };
    const context = createMockContext(propsInput);
    const destroyError = new Error('Failed to destroy connection');
    const mockResultRows = [{ '1': 1 }];

    mockIsUp.mockReturnValue(true);

    mockExecute.mockImplementationOnce(({ complete }) => {
      process.nextTick(() => complete(undefined, {}, mockResultRows));
    });
    mockDestroy.mockImplementationOnce((callback) => {
      process.nextTick(() => callback(destroyError));
    });

    await expect(runQuery.run(context)).rejects.toThrow(destroyError);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });
});
