import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createApprovalLink } from './lib/actions/create-approval-link';
import { waitForApprovalLink } from './lib/actions/wait-for-approval';

export const approval = createBlock({
  displayName: 'Approval',
  description: 'Build approval process in your workflows',

  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/approval-block.svg',
  authors: ['kishanprmr', 'MoShizzle', 'khaledmashaly', 'abuaboud'],
  categories: [BlockCategory.CORE],
  actions: [waitForApprovalLink, createApprovalLink],
  triggers: [],
});
