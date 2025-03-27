import { createBlock } from '@openops/blocks-framework';
import { googleCloudAuth } from '@openops/common';
import { googleCloudCliAction } from './lib/actions/google-cloud-cli-action';

export const googleCloud = createBlock({
  displayName: 'Google Cloud (GCP)',
  auth: googleCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/google-cloud.svg',
  authors: [],
  actions: [googleCloudCliAction],
  triggers: [],
});
