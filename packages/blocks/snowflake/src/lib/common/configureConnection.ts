import { BlockPropValueSchema } from '@openops/blocks-framework';
import snowflakeSdk from 'snowflake-sdk';
import { DEFAULT_APPLICATION_NAME, DEFAULT_QUERY_TIMEOUT } from './constants';
import { snowflakeAuth } from './snowflakeAuth';

export function configureConnection(
  auth: BlockPropValueSchema<typeof snowflakeAuth>,
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
  });
}
