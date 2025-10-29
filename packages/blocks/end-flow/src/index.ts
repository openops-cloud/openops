import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { stopFlowAction } from './lib/actions/end-workflow';

export const stopFlow = createBlock({
  displayName: 'Stop Execution',
  description: 'Stop the current scope execution (flow or loop iteration)',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/end-flow.svg',
  authors: [],
  actions: [stopFlowAction],
  triggers: [],
  categories: [BlockCategory.WORKFLOW],
});
