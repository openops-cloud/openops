import { createBlock } from '@openops/blocks-framework';
import { executeSqlStatement } from './lib/actions/execute-sql-statement';
import { databricksAuth } from './lib/common/auth';

export const databricks = createBlock({
  displayName: 'Databricks',
  auth: databricksAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/databricks.png',
  authors: [],
  actions: [executeSqlStatement],
  triggers: [],
});
