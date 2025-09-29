import { createBlock } from '@openops/blocks-framework';
import { aiAuth } from '@openops/common';

export const ai = createBlock({
  displayName: 'AI',
  auth: aiAuth,
  minimumSupportedRelease: '0.7.1',
  logoUrl: 'https://static.openops.com/blocks/ai-logo.png',
  authors: [],
  actions: [],
  triggers: [],
});
