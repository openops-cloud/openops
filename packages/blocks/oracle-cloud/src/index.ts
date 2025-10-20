import { createBlock } from '@openops/blocks-framework';
import { oracleCloudAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { getTenancyName } from './lib/actions/get-tenancy-name-action';

export const oracleCloud = createBlock({
  displayName: 'Oracle Cloud (OCI)',
  auth: oracleCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/oracle-cloud.svg',
  authors: [],
  categories: [BlockCategory.CLOUD],
  actions: [getTenancyName],
  triggers: [],
});
