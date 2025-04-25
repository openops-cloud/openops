import { createBlock } from '@openops/blocks-framework';
import { googleCloudAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { executeSqlQueryAction } from './lib/actions/execute-sql-query-action';
import { getRecommendationsAction } from './lib/actions/get-recommendations-cli-action';
import { googleCloudCliAction } from './lib/actions/google-cloud-cli-action';

export const googleCloud = createBlock({
  displayName: 'Google Cloud (GCP)',
  auth: googleCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/google-cloud.svg',
  authors: [],
  actions: [
    googleCloudCliAction,
    getRecommendationsAction,
    executeSqlQueryAction,
  ],
  categories: [BlockCategory.CLOUD, BlockCategory.DATA_SOURCES],
  triggers: [],
});
