import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { optscaleAuth } from './lib/auth';

export const optscale = createBlock({
  displayName: 'OptScale',
  auth: optscaleAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: '/blocks/optscale.svg',
  authors: ['OpenOps'],
  categories: [BlockCategory.FINOPS],
  actions: [],
  triggers: [],
});
