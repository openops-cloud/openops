import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { extractFromListAction } from './lib/actions/extract-from-action';
import { groupByAction } from './lib/actions/group-by-action';
import { toMapAction } from './lib/actions/to-dictionary-action';

export const listOperations = createBlock({
  displayName: 'List Operations',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.9.0',
  displayIcon: 'List',
  authors: [],
  actions: [groupByAction, extractFromListAction, toMapAction],
  triggers: [],
  categories: [BlockCategory.CORE],
});
