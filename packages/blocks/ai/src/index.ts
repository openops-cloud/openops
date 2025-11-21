import { createBlock } from '@openops/blocks-framework';
import { aiAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { aiStep } from './lib/actions/ai-step';

export const ai = createBlock({
  displayName: 'AI',
  auth: aiAuth,
  categories: [BlockCategory.CORE],
  minimumSupportedRelease: '0.7.1',
  logoUrl: 'https://static.openops.com/blocks/openops-ai.svg',
  authors: [],
  actions: [aiStep],
  triggers: [],
});
