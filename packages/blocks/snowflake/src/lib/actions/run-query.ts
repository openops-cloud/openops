import { createAction, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import snowflakeSdk from 'snowflake-sdk';

import {
  DEFAULT_APPLICATION_NAME,
  DEFAULT_QUERY_TIMEOUT,
} from '../common/constants';
import { customAuth } from '../common/custom-auth';

const props = {
  sqlText: Property.ShortText({
    displayName: 'SQL query',
    description: 'Use :1, :2… or ? placeholders to use binding parameters.',
    required: true,
  }),
  binds: Property.Array({
    displayName: 'Parameters',
    description:
      'Binding parameters for the SQL query (to prevent SQL injection attacks)',
    required: false,
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

export const runQuery = createAction({
  name: 'runQuery',
  displayName: 'Run Query',
  description: 'Run Query',
  auth: customAuth,
  props,
  async run(context) {
    const { username, password, role, database, warehouse, account } =
      context.auth;
    const { sqlText, binds, timeout, application } = context.propsValue;

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

    let connectionActive = false; // Flag to track if destroy is needed

    try {
      // Connect (Promisified)
      await new Promise<void>((resolve, reject) => {
        connection.connect((err) => {
          if (err) {
            logger.error('Snowflake Connection Error', { err });
            reject(err);
          } else {
            connectionActive = true; // Mark active ONLY on success
            resolve();
          }
        });
      });

      // Execute (Promisified) - Only runs if connect succeeded
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await new Promise<any[] | undefined>((resolve, reject) => {
        connection.execute({
          sqlText,
          binds: binds as snowflakeSdk.Binds, // Use resolved binds
          complete: (err, _, rows) => {
            if (err) {
              logger.error('Snowflake Connection Error', { err, sqlText });

              reject(err);
            } else {
              resolve(rows);
            }
          },
        });
      });

      // Destroy (Promisified) - Runs after successful execution
      // Note: We destroy before returning the rows from execute
      await new Promise<void>((resolve, reject) => {
        connection.destroy((err) => {
          connectionActive = false; // Connection is no longer active
          if (err) {
            logger.error('Snowflake Connection Error', { err });

            // Decide if destroy failure should prevent returning results
            // Rejecting here means a destroy error overrides a successful query
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Return results only if ALL steps succeeded
      return rows;
    } catch (error) {
      // Error occurred in connect, execute, or destroy promise

      // Attempt cleanup only if connection was successfully established
      // and destroy hasn't already run (or failed)
      if (
        connectionActive &&
        connection &&
        typeof connection.destroy === 'function'
      ) {
        try {
          // Use a separate promise for cleanup destroy to avoid masking original error
          await new Promise<void>((resolve) => {
            // Don't reject outer promise on cleanup failure
            connection.destroy((destroyErr) => {
              if (destroyErr) {
                logger.error('Snowflake Error during cleanup destroy', {
                  err: destroyErr,
                });
              }
              // Always resolve cleanup promise
              resolve();
            });
          });
        } catch (cleanupError) {
          logger.error('Exception during connection cleanup', {
            err: cleanupError,
          });
        }
      }
      // Re-throw the original error that caused the catch block
      throw error;
    }
  },
});
