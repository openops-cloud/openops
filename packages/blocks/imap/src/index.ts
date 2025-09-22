import { createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { imapAuth } from './lib/common/imap-auth';
import { newEmail } from './lib/triggers/new-email';

export const imapBlock = createBlock({
  displayName: 'IMAP',
  description: 'Receive new email trigger',
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://static.openops.com/blocks/imap.png',
  categories: [BlockCategory.COLLABORATION],
  authors: [],
  auth: imapAuth,
  actions: [],
  triggers: [newEmail],
});
