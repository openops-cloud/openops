import { createBlock } from '@openops/blocks-framework';
import { gcpCliAction } from './lib/actions/gcp-cli-action';
import { gcpAuth } from './lib/gcp-auth';

export const gcp = createBlock({
  displayName: 'Gcp',
  auth: gcpAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/gcp.png',
  authors: [],
  actions: [gcpCliAction],
  triggers: [],
});
