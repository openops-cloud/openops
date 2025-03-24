import { createBlock } from '@openops/blocks-framework';
import { gcpCliAction } from './lib/actions/gcp-cli-action';
import { googleCloudAuth } from './lib/gcp-auth';

export const googleCloud = createBlock({
  displayName: 'Google Cloud',
  auth: googleCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/google-cloud.svg',
  authors: [],
  actions: [gcpCliAction],
  triggers: [],
});
