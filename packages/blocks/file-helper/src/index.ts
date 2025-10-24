import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { readFileAction } from './lib/actions/read-file';

export const filesHelper = createBlock({
  displayName: 'File Operations',
  description: 'Read file content and return it in different formats.',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.9.0',
  categories: [BlockCategory.CORE],
  displayIcon: 'File',
  authors: ['kishanprmr', 'MoShizzle', 'abuaboud'],
  actions: [readFileAction],
  triggers: [],
});
