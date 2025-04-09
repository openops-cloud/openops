import { BlockPropValueSchema } from '@openops/blocks-framework';
import snowflakeSdk from 'snowflake-sdk';
import { DEFAULT_APPLICATION_NAME, DEFAULT_QUERY_TIMEOUT } from './constants';
import { customAuth } from './custom-auth';

export function configureConnection(
  auth: BlockPropValueSchema<typeof customAuth>,
) {
  return snowflakeSdk.createConnection({
    application: DEFAULT_APPLICATION_NAME,
    timeout: DEFAULT_QUERY_TIMEOUT,
    username: auth.username,
    password: auth.password,
    role: auth.role,
    database: auth.database,
    warehouse: auth.warehouse,
    account: auth.account,
    // @ts-expect-error ConnectionOptions interface definition in @types/snowflake-sdk is missing this property
    sfRetryMaxLoginRetries: auth.maxLoginRetries,
  });
}
