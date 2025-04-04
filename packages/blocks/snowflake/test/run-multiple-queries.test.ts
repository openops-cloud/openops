/* eslint-disable @typescript-eslint/no-explicit-any */
import snowflakeSdk, { SnowflakeError, Statement } from 'snowflake-sdk';
import { runMultipleQueries } from '../src/lib/actions/run-multiple-queries';
import {
  DEFAULT_APPLICATION_NAME,
  DEFAULT_QUERY_TIMEOUT,
} from '../src/lib/common/constants';

const mockConnect = jest.fn();
const mockExecute = jest.fn();
const mockDestroy = jest.fn();

// Keep track of whether the connection thinks it's active for destroy logic
let isConnectionActive = false;

jest.mock('snowflake-sdk', () => ({
  createConnection: jest.fn(() => ({
    connect: mockConnect,
    execute: mockExecute,
    destroy: mockDestroy,
    // Simulate isUp based on our tracked state for potential future use
    isUp: jest.fn(() => isConnectionActive),
  })),
  // Expose SnowflakeError type if needed for mocking errors
  SnowflakeError: class MockSnowflakeError extends Error {
    code: string | undefined;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
      this.name = 'SnowflakeError';
    }
  },
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
    application: propsValueInput.application ?? DEFAULT_APPLICATION_NAME,
    timeout: propsValueInput.timeout ?? DEFAULT_QUERY_TIMEOUT,
    useTransaction: propsValueInput.useTransaction ?? false,
    binds: propsValueInput.binds,
    sqlTexts: propsValueInput.sqlTexts,
  };

  return {
    auth: auth as RunMultipleQueriesContext['auth'],
    propsValue: finalPropsValue as RunMultipleQueriesContext['propsValue'],
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  } as any;
};

describe('Snowflake: runMultipleQueries Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isConnectionActive = false;

    // Default successful connect behavior
    mockConnect.mockImplementation((callback) => {
      process.nextTick(() => {
        isConnectionActive = true; // Mark active on successful connect
        callback(undefined);
      });
    });

    // Default successful execute behavior (handles BEGIN/COMMIT/ROLLBACK returning no rows)
    mockExecute.mockImplementation(
      ({
        sqlText,
        complete,
      }: {
        sqlText: string;
        complete: (
          err?: SnowflakeError | Error,
          stmt?: Statement,
          rows?: unknown[],
        ) => void;
      }) => {
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
      },
    );

    // Default successful destroy behavior
    mockDestroy.mockImplementation((callback) => {
      process.nextTick(() => {
        isConnectionActive = false; // Mark inactive on destroy
        callback(undefined);
      });
    });
  });

  it('should successfully execute multiple queries without transaction', async () => {
    // Type of 'props' now matches MockPropsValueInput (sqlTexts required)
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1', 'SELECT 2'],
      useTransaction: false,
    };
    const context = createMockContext(props);

    const expectedResults = [
      { query: 'SELECT 1', result: [{ RESULT: 'Success: SELECT 1' }] },
      { query: 'SELECT 2', result: [{ RESULT: 'Success: SELECT 2' }] },
    ];

    // Use type assertion 'as RunMultipleQueriesContext' or 'as any' is fine here
    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).resolves.toEqual(expectedResults);

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
    // Verify transaction commands were NOT called
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

  it('should successfully execute multiple queries WITH transaction', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['INSERT INTO T (col) VALUES (1)', 'UPDATE T SET col = 2'],
      useTransaction: true,
    };
    const context = createMockContext(props);

    const expectedResults = [
      {
        query: 'INSERT INTO T (col) VALUES (1)',
        result: [{ RESULT: 'Success: INSERT INTO T (col) VALUES (1)' }],
      },
      {
        query: 'UPDATE T SET col = 2',
        result: [{ RESULT: 'Success: UPDATE T SET col = 2' }],
      },
    ];

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).resolves.toEqual(expectedResults);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    // BEGIN + 2 queries + COMMIT = 4 execute calls
    expect(mockExecute).toHaveBeenCalledTimes(4);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'INSERT INTO T (col) VALUES (1)' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sqlText: 'UPDATE T SET col = 2' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    expect(mockDestroy).toHaveBeenCalledTimes(1);
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

    await runMultipleQueries.run(context as RunMultipleQueriesContext);

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

  it('should execute successfully with binds', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT :1', 'SELECT :2'],
      binds: ['value1', 123],
      useTransaction: false,
    };
    const context = createMockContext(props);

    const expectedResults = [
      { query: 'SELECT :1', result: [{ RESULT: 'Success: SELECT :1' }] },
      { query: 'SELECT :2', result: [{ RESULT: 'Success: SELECT :2' }] },
    ];

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).resolves.toEqual(expectedResults);

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sqlText: 'SELECT :1',
        binds: ['value1', 123],
      }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sqlText: 'SELECT :2',
        binds: ['value1', 123],
      }),
    );
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('should reject if connection fails', async () => {
    const props: MockPropsValueInput = { sqlTexts: ['SELECT 1'] };
    const context = createMockContext(props);
    const connectionError = new Error('Network Error');

    mockConnect.mockImplementationOnce((callback) => {
      process.nextTick(() => {
        isConnectionActive = false;
        callback(connectionError);
      });
    });

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(connectionError);

    expect(snowflakeSdk.createConnection).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('should reject and not run subsequent queries if one fails (no transaction)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1', 'INVALID SYNTAX', 'SELECT 3'],
      useTransaction: false,
    };
    const context = createMockContext(props);
    const executionError = new Error('SQL compilation error');

    // Fail on the second execute call
    mockExecute.mockImplementationOnce(({ complete }) =>
      process.nextTick(() =>
        complete(undefined, {}, [{ RESULT: 'Success: SELECT 1' }]),
      ),
    );
    mockExecute.mockImplementationOnce(
      ({ complete }) => process.nextTick(() => complete(executionError)), // Fail for INVALID SYNTAX
    );

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(executionError);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(2); // Called for SELECT 1 and INVALID SYNTAX
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'SELECT 1' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'INVALID SYNTAX' }),
    );
    // Should NOT have called SELECT 3 or any transaction commands
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'SELECT 3' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'ROLLBACK' }),
    );
    // Destroy should be called for cleanup
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('should reject, ROLLBACK, and not run subsequent queries if one fails (WITH transaction)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['INSERT 1', 'INVALID SYNTAX', 'INSERT 2'],
      useTransaction: true,
    };
    const context = createMockContext(props);
    const executionError = new Error('SQL compilation error');

    // Mock sequence: BEGIN -> INSERT 1 (Ok) -> INVALID SYNTAX (Fail) -> ROLLBACK (Ok)
    mockExecute.mockReset(); // Clear default implementation for specific sequence
    mockExecute
      .mockImplementationOnce(
        // BEGIN
        ({ complete }) => process.nextTick(() => complete(undefined)),
      )
      .mockImplementationOnce(
        // INSERT 1
        ({ complete }) =>
          process.nextTick(() =>
            complete(undefined, {}, [{ RESULT: 'Success: INSERT 1' }]),
          ),
      )
      .mockImplementationOnce(
        // INVALID SYNTAX (Fail)
        ({ complete }) => process.nextTick(() => complete(executionError)),
      )
      .mockImplementationOnce(
        // ROLLBACK
        ({ complete }) => process.nextTick(() => complete(undefined)),
      );

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(executionError);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    // BEGIN, INSERT 1, INVALID SYNTAX, ROLLBACK
    expect(mockExecute).toHaveBeenCalledTimes(4);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'INSERT 1' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sqlText: 'INVALID SYNTAX' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ sqlText: 'ROLLBACK' }),
    );
    // Should NOT have called INSERT 2 or COMMIT
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'INSERT 2' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    // Destroy should be called after ROLLBACK attempt
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  // Test that failed previously due to timeout
  it('should reject if BEGIN fails (WITH transaction)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1'],
      useTransaction: true,
    };
    const context = createMockContext(props);
    const beginError = new Error('Failed to start transaction');

    // Mock sequence: BEGIN (Fail) -> ROLLBACK (Ok during cleanup) -> Destroy (Ok during cleanup)
    mockExecute.mockReset();
    mockExecute
      .mockImplementationOnce(
        // BEGIN fails
        ({ complete }) => process.nextTick(() => complete(beginError)),
      )
      // Add mock for ROLLBACK called during handleError
      .mockImplementationOnce(
        // ROLLBACK (Ok)
        ({ sqlText, complete }) => {
          expect(sqlText).toBe('ROLLBACK');
          process.nextTick(() => complete(undefined));
        },
      );

    // Ensure destroy mock is ready for the cleanup call
    mockDestroy.mockImplementationOnce((callback) => {
      process.nextTick(() => {
        isConnectionActive = false;
        callback(undefined); // Successful destroy
      });
    });

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(beginError);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    // BEGIN (attempted) + ROLLBACK (attempted during cleanup)
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'ROLLBACK' }),
    );
    // No other queries or COMMIT should be called
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'SELECT 1' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    // Destroy should be called for cleanup after ROLLBACK
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  }, 10000);

  // Test that failed previously due to timeout
  it('should reject if COMMIT fails (WITH transaction)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1'],
      useTransaction: true,
    };
    const context = createMockContext(props);
    const commitError = new Error('Failed to commit transaction');

    // Mock Sequence: BEGIN (Ok) -> SELECT 1 (Ok) -> COMMIT (Fail) -> ROLLBACK (Ok during cleanup) -> Destroy (Ok during cleanup)
    mockExecute.mockReset();
    mockExecute
      .mockImplementationOnce(
        // BEGIN (Ok)
        ({ complete }) => process.nextTick(() => complete(undefined)),
      )
      .mockImplementationOnce(
        // SELECT 1 (Ok)
        ({ complete }) =>
          process.nextTick(() =>
            complete(undefined, {}, [{ RESULT: 'Success: SELECT 1' }]),
          ),
      )
      .mockImplementationOnce(
        // COMMIT (Fail)
        ({ complete }) => process.nextTick(() => complete(commitError)),
      )
      .mockImplementationOnce(
        // ROLLBACK (Ok)
        ({ sqlText, complete }) => {
          expect(sqlText).toBe('ROLLBACK');
          process.nextTick(() => complete(undefined));
        },
      );

    // Ensure destroy mock is ready for the cleanup call
    mockDestroy.mockImplementationOnce((callback) => {
      process.nextTick(() => {
        isConnectionActive = false;
        callback(undefined); // Successful destroy
      });
    });

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(commitError);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    // BEGIN, SELECT 1, COMMIT (attempted), ROLLBACK (attempted during cleanup)
    expect(mockExecute).toHaveBeenCalledTimes(4);
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'SELECT 1' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ sqlText: 'ROLLBACK' }),
    );
    // Destroy should be called for cleanup after ROLLBACK
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  }, 10000);

  it('should reject with original error if ROLLBACK fails during error handling', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['INSERT 1', 'INVALID SYNTAX'],
      useTransaction: true,
    };
    const context = createMockContext(props);
    const executionError = new Error('SQL compilation error');
    const rollbackError = new Error('Failed to rollback');

    // Mock: BEGIN (Ok) -> INSERT 1 (Fail) -> ROLLBACK (Fail)
    mockExecute.mockReset();
    mockExecute
      .mockImplementationOnce(
        // BEGIN
        ({ complete }) => process.nextTick(() => complete(undefined)),
      )
      .mockImplementationOnce(
        // INSERT 1 (Fail)
        ({ complete }) => process.nextTick(() => complete(executionError)),
      )
      .mockImplementationOnce(
        // ROLLBACK (Fail)
        ({ complete }) => process.nextTick(() => complete(rollbackError)),
      );

    // Should reject with the *original* executionError, not the rollbackError
    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(executionError);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(3); // BEGIN, INSERT 1, ROLLBACK
    expect(mockExecute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sqlText: 'BEGIN' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sqlText: 'INSERT 1' }),
    );
    expect(mockExecute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sqlText: 'ROLLBACK' }),
    );
    expect(mockExecute).not.toHaveBeenCalledWith(
      expect.objectContaining({ sqlText: 'COMMIT' }),
    );
    // Destroy should still be called after failed ROLLBACK attempt
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('should reject if destroy fails after successful execution (no transaction)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1'],
      useTransaction: false,
    };
    const context = createMockContext(props);
    const destroyError = new Error('Failed to destroy connection');

    // Ensure execute succeeds
    mockExecute.mockReset();
    mockExecute.mockImplementationOnce(({ complete }) =>
      process.nextTick(() =>
        complete(undefined, {}, [{ RESULT: 'Success: SELECT 1' }]),
      ),
    );
    // Make destroy fail
    mockDestroy.mockImplementationOnce((callback) => {
      process.nextTick(() => {
        isConnectionActive = false; // Still mark as inactive even if destroy errors
        callback(destroyError);
      });
    });

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(destroyError);

    // Verify all main steps were attempted
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(1); // Only SELECT 1
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('should reject if destroy fails after successful execution (WITH transaction)', async () => {
    const props: MockPropsValueInput = {
      sqlTexts: ['SELECT 1'],
      useTransaction: true,
    };
    const context = createMockContext(props);
    const destroyError = new Error('Failed to destroy connection');

    // Ensure BEGIN, SELECT 1, COMMIT succeed
    mockExecute.mockReset();
    mockExecute
      .mockImplementationOnce(({ complete }) =>
        process.nextTick(() => complete(undefined)),
      ) // BEGIN
      .mockImplementationOnce(({ complete }) =>
        process.nextTick(() =>
          complete(undefined, {}, [{ RESULT: 'Success: SELECT 1' }]),
        ),
      ) // SELECT 1
      .mockImplementationOnce(({ complete }) =>
        process.nextTick(() => complete(undefined)),
      ); // COMMIT
    // Make destroy fail
    mockDestroy.mockImplementationOnce((callback) => {
      process.nextTick(() => {
        isConnectionActive = false;
        callback(destroyError);
      });
    });

    await expect(
      runMultipleQueries.run(context as RunMultipleQueriesContext),
    ).rejects.toThrow(destroyError);

    // Verify all main steps were attempted
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledTimes(3); // BEGIN, SELECT 1, COMMIT
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });
});
