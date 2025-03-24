import { createBlock } from '@openops/blocks-framework';
import { googleCloudAuth } from '@openops/common';

export const googleCloud = createBlock({
  displayName: 'Google Cloud',
  auth: googleCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/google-cloud.svg',
  authors: [],
  actions: [],
  triggers: [],
});
