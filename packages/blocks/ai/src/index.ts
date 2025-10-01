import { createBlock } from '@openops/blocks-framework';
import { aiAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { analyze } from './lib/actions/analyze';

export const ai = createBlock({
  displayName: 'AI',
  auth: aiAuth,
  blockCategory: BlockCategory.CORE,
  minimumSupportedRelease: '0.7.1',
  logoUrl: 'https://static.openops.com/blocks/ai-logo.png',
  authors: [],
  actions: [analyze],
  triggers: [],
});
