import { createBlock } from '@openops/blocks-framework';
import { getBudgets } from './lib/actions/get-budgets';
import { ternaryCloudAuth } from './lib/common/auth';

export const ternary = createBlock({
  displayName: 'Ternary',
  description: 'FinOps multi-cloud analytics platform.',
  auth: ternaryCloudAuth,
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/ternary.png',
  categories: [],
  authors: ['Quilyx'],
  actions: [getBudgets],
  triggers: [],
});
