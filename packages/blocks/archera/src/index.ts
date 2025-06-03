import { createBlock } from '@openops/blocks-framework';
import { archeraAuth } from './auth';
import { getRecommendationsAction } from './lib/actions/get-recommendations-action';

export const archera = createBlock({
  displayName: 'Archera',
  auth: archeraAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/archera.jpeg',
  authors: [],
  actions: [getRecommendationsAction],
  triggers: [],
});
