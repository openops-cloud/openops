import snowflakeSdk, { Statement } from 'snowflake-sdk';
import { runMultipleQueries } from '../src/lib/actions/run-multiple-queries';
import {
  DEFAULT_APPLICATION_NAME,
  DEFAULT_QUERY_TIMEOUT,
} from '../src/lib/common/constants';

const mockConnect = jest.fn();
const mockExecute = jest.fn();
const mockDestroy = jest.fn();

jest.mock('snowflake-sdk', () => ({
  createConnection: jest.fn(() => ({
    connect: mockConnect,
    execute: mockExecute,
    destroy: mockDestroy,
  })),
}));

type RunMultipleQueriesContext = Parameters<typeof runMultipleQueries.run>[0];

type MockAuthInput = Partial<RunMultipleQueriesContext['auth']>;
type MockPropsValueInput = {
  sqlTexts: string[];
  binds?: unknown[];
  useTransaction?: boolean;
  timeout?: number;
  application?: string;
};

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
): RunMultipleQueriesContext => {
  const finalPropsValue = {
    application: DEFAULT_APPLICATION_NAME,
    timeout: DEFAULT_QUERY_TIMEOUT,
    useTransaction: false,
    binds: undefined,
    ...propsValueInput,
  };

  return {
    auth: auth as RunMultipleQueriesContext['auth'],
    propsValue: finalPropsValue as RunMultipleQueriesContext['propsValue'],
  } as RunMultipleQueriesContext;
};

describe('runMultipleQueries Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockConnect.mockImplementation((callback) => {
      process.nextTick(() => callback(undefined));
    });

    mockExecute.mockImplementation(({ sqlText, complete }) => {
      const mockStmt = {} as Statement;
      let mockRows: unknown[] = [{ RESULT: `Success: ${sqlText}` }];
      if (
        sqlText === 'BEGIN' ||
        sqlText === 'COMMIT' ||
        sqlText === 'ROLLBACK'
      ) {
        mockRows = [];
      }
      process.nextTick(() => complete(undefined, mockStmt, mockRows));
    });

    mockDestroy.mockImplementation((callback) => {
      process.nextTick(() => callback(undefined));
    });
  });

  it('should successfully execute multiple queries without transaction', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1', 'SELECT 2'],
      useTransaction: false,
    };
    const context = createMockContext(props);

    const expectedResults = [
      { query: 'SELECT 1', result: [{ RESULT: 'Success: SELECT 1' }] },
      { query: 'SELECT 2', result: [{ RESULT: 'Success: SELECT 2' }] },
    ];

    await expect(runMultipleQueries.run(context)).resolves.toEqual(
      expectedResults,
    );

    expect(snowflakeSdk.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'testuser',
        application: DEFAULT_APPLICATION_NAME,
        timeout: DEFAULT_QUERY_TIMEOUT,
        account: 'testaccount',
        database: 'testdb',
        password: 'testpassword',
        role: 'testrole',
        warehouse: 'testwh',
      }),
    );

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'SELECT 1' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'SELECT 2' }),
    );
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'ROLLBACK' }),
    );
  });

  it('should use provided connection parameters (timeout, application)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1'],
      timeout: 5000,
      application: 'MyTestApp',
      useTransaction: false,
    };
    const context = createMockContext(props);

    await runMultipleQueries.run(context);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 5000,
        application: 'MyTestApp',
        username: 'testuser',
        account: 'testaccount',
      }),
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });
});
