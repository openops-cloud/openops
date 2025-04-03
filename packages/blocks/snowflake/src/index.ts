import { createBlock } from '@openops/blocks-framework';
import { snowflakeAuth } from './lib/common/snowflakeAuth';

export const snowflake = createBlock({
  displayName: 'Snowflake',
  description: 'Data warehouse built for the cloud',
  auth: snowflakeAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/snowflake.svg',
  authors: [],
  actions: [],
  triggers: [],
});
