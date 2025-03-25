import { BlockAuth, createBlock } from '@openops/blocks-framework';

export const googleCloud = createBlock({
  displayName: 'Google Cloud',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/google-cloud.svg',
  authors: [],
  actions: [],
  triggers: [],
});
