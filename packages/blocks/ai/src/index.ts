import { createBlock } from '@openops/blocks-framework';
import { aiAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { askAi } from './lib/actions/askAi';

export const ai = createBlock({
  displayName: 'AI',
  auth: aiAuth,
  categories: [BlockCategory.CORE],
  minimumSupportedRelease: '0.7.1',
  displayIcon: 'Wand',
  authors: [],
  actions: [askAi],
  triggers: [],
});
