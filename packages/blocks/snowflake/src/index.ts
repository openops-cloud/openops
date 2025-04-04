import { createBlock } from '@openops/blocks-framework';
import { insertRow } from './lib/actions/insert-row';
import { customAuth } from './lib/common/custom-auth';

export const snowflake = createBlock({
  displayName: 'Snowflake',
  description: 'Data warehouse built for the cloud',
  auth: customAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/snowflake-logo.svg',
  authors: [],
  actions: [insertRow],
  triggers: [],
});
