import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';

export const optscale = createBlock({
  displayName: 'OptScale',
  auth: undefined,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/optscale.svg',
  authors: ['OpenOps'],
  categories: [BlockCategory.FINOPS],
  actions: [],
  triggers: [],
});
