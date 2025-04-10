import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { insertRow } from './lib/actions/insert-row';
import { runMultipleQueries } from './lib/actions/run-multiple-queries';
import { runQuery } from './lib/actions/run-query';
import { customAuth } from './lib/common/custom-auth';

export const snowflake = createBlock({
  displayName: 'Snowflake',
  description: 'Data warehouse built for the cloud',
  auth: customAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/snowflake-logo.svg',
  authors: [],
  categories: [BlockCategory.DATA_SOURCES],
  actions: [runQuery, runMultipleQueries, insertRow],
  triggers: [],
});
