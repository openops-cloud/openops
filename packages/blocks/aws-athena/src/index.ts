import { createBlock } from '@openops/blocks-framework';
import { amazonAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { runAthenaQueryAction } from './lib/actions/query-athena-action';

export const awsAthena = createBlock({
  displayName: 'AWS Athena',
  auth: amazonAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/aws-athena.png',
  categories: [BlockCategory.CLOUD],
  authors: [],
  actions: [runAthenaQueryAction],
  triggers: [],
});
