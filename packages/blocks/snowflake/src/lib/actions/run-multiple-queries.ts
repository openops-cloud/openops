import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import snowflakeSdk, {
  Binds,
  Connection,
  SnowflakeError,
  Statement,
} from 'snowflake-sdk';
import {
  DEFAULT_APPLICATION_NAME,
  DEFAULT_QUERY_TIMEOUT,
} from '../common/constants';
import { customAuth } from '../common/custom-auth';

type QueryResult = unknown[] | undefined;
type QueryResults = { query: string; result: QueryResult }[];

const props = {
  sqlTexts: Property.Array({
    displayName: 'SQL queries',
    description:
      'Array of SQL queries to execute in order, in the same transaction. Use :1, :2… placeholders to use binding parameters. ' +
      'Avoid using "?" to avoid unexpected behaviors when having multiple queries.',
    required: true,
  }),
  binds: Property.Array({
    displayName: 'Parameters',
    description:
      'Binding parameters shared across all queries to prevent SQL injection attacks. ' +
      'Use :1, :2, etc. to reference parameters in order. ' +
      'Avoid using "?" to avoid unexpected behaviors when having multiple queries. ' +
      'Unused parameters are allowed.',
    required: false,
  }),
  useTransaction: Property.Checkbox({
    displayName: 'Use Transaction',
    description:
      'When enabled, all queries will be executed in a single transaction. If any query fails, all changes will be rolled back.',
    required: false,
    defaultValue: false,
  }),
  timeout: Property.Number({
    displayName: 'Query timeout (ms)',
    description:
      'An integer indicating the maximum number of milliseconds to wait for a query to complete before timing out.',
    required: false,
    defaultValue: DEFAULT_QUERY_TIMEOUT,
  }),
  application: Property.ShortText({
    displayName: 'Application name',
    description:
      'A string indicating the name of the client application connecting to the server.',
    required: false,
    defaultValue: DEFAULT_APPLICATION_NAME,
  }),
};

function handleExecutionError(
  error: SnowflakeError,
  connection: Connection,
  useTransaction: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (reason?: any) => void,
): void {
  const performDestroy = () => {
    connection.destroy((destroyErr) => {
      if (destroyErr) {
        logger.error('Error destroying connection during error handling:', {
          err: destroyErr,
        });
      }
      reject(error);
    });
  };

  if (useTransaction) {
    connection.execute({
      sqlText: 'ROLLBACK',
      complete: (rollbackErr) => {
        if (rollbackErr) {
          logger.error('Error executing ROLLBACK:', { err: rollbackErr });
        }
        performDestroy();
      },
    });
  } else {
    performDestroy();
  }
}

function executeSingleQuery(
  connection: Connection,
  sqlText: string,
  binds: Binds | undefined,
): Promise<QueryResult> {
  return new Promise<QueryResult>((resolveQuery, rejectQuery) => {
    connection.execute({
      sqlText: sqlText,
      binds: binds,
      complete: (
        err: SnowflakeError | undefined,
        stmt: Statement,
        rows: QueryResult,
      ) => {
        if (err) {
          rejectQuery(err);
        } else {
          resolveQuery(rows);
        }
      },
    });
  });
}

function executeTransactionCommand(
  connection: Connection,
  command: 'BEGIN' | 'COMMIT',
): Promise<void> {
  return new Promise<void>((resolveCommand, rejectCommand) => {
    connection.execute({
      sqlText: command,
      complete: (err: SnowflakeError | undefined) => {
        if (err) {
          rejectCommand(err);
        } else {
          resolveCommand();
        }
      },
    });
  });
}

/**
 * Core logic for executing queries sequentially after connection is established.
 * Accepts a generally typed propsValue object, relying on the caller (run)
 * for correctness based on inference.
 */
async function processQueries(
  connection: Connection,
  propsValue: {
    sqlTexts: unknown;
    binds: unknown;
    useTransaction: unknown;
  },
  resolve: (value: QueryResults | PromiseLike<QueryResults>) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (reason?: any) => void,
) {
  const sqlTexts = propsValue.sqlTexts as string[] | undefined;
  const binds = propsValue.binds as Binds | undefined;
  const useTransaction = Boolean(propsValue.useTransaction);

  const queryResults: QueryResults = [];

  try {
    if (useTransaction) {
      await executeTransactionCommand(connection, 'BEGIN');
    }

    const sqlStrings = Array.isArray(sqlTexts) ? sqlTexts : [];
    for (const sqlText of sqlStrings) {
      if (typeof sqlText !== 'string') {
        reject(new Error(`Invalid non-string SQL query found: ${sqlText}`));
        return;
      }
      const result = await executeSingleQuery(connection, sqlText, binds);
      queryResults.push({
        query: sqlText,
        result,
      });
    }

    if (useTransaction) {
      await executeTransactionCommand(connection, 'COMMIT');
    }

    connection.destroy((destroyErr: SnowflakeError | undefined) => {
      if (destroyErr) {
        reject(destroyErr);
      } else {
        resolve(queryResults);
      }
    });
  } catch (error) {
    handleExecutionError(
      error as SnowflakeError,
      connection,
      useTransaction,
      reject,
    );
  }
}

export const runMultipleQueries = createAction({
  name: 'runMultipleQueries',
  displayName: 'Run Multiple Queries',
  description: 'Run Multiple Queries',
  auth: customAuth,
  props,

  run(context): Promise<QueryResults> {
    const { username, password, role, database, warehouse, account } =
      context.auth;
    const { application, timeout } = context.propsValue;

    const connection = snowflakeSdk.createConnection({
      application,
      timeout,
      username,
      password,
      role,
      database,
      warehouse,
      account,
    });

    return new Promise<QueryResults>((resolve, reject) => {
      connection.connect((connectErr: SnowflakeError | undefined) => {
        if (connectErr) {
          reject(connectErr);
          return;
        }
        processQueries(connection, context.propsValue, resolve, reject);
      });
    });
  },
});
