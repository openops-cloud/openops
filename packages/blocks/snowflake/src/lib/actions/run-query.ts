import { createAction, Property } from '@openops/blocks-framework';
import snowflake from 'snowflake-sdk';
import {
  DEFAULT_APPLICATION_NAME,
  DEFAULT_QUERY_TIMEOUT,
} from '../common/constants';
import { customAuth } from '../common/custom-auth';

const props = {
  sqlText: Property.LongText({
    displayName: 'SQL query',
    description: 'Use :1, :2… or ? placeholders to use binding parameters.',
    required: true,
    supportsAI: true,
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
    const {
      username,
      password,
      maxLoginRetries,
      role,
      database,
      warehouse,
      account,
    } = context.auth;

    const connection = snowflake.createConnection({
      application: context.propsValue.application,
      timeout: context.propsValue.timeout,
      username,
      password,
      // @ts-expect-error ConnectionOptions interface definition in @types/snowflake-sdk is missing this property
      sfRetryMaxLoginRetries: maxLoginRetries,
      role,
      database,
      warehouse,
      account,
    });

    return new Promise((resolve, reject) => {
      connection.connect(function (err) {
        if (err) {
          reject(err);
        }
      });

      const { sqlText, binds } = context.propsValue;

      connection.execute({
        sqlText: sqlText.replace(/\s+/g, ' '),
        binds: binds as snowflake.Binds,
        complete: (err, _, rows) => {
          if (err) {
            reject(err);
          }
          connection.destroy((err) => {
            if (err) {
              reject(err);
            }
          });
          resolve(rows);
        },
      });
    });
  },
});
