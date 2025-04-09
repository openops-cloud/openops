import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { storageAddtoList } from './lib/actions/store-add-to-list';
import { storageAppendAction } from './lib/actions/store-append-action';
import { storageGetAction } from './lib/actions/store-get-action';
import { storagePutAction } from './lib/actions/store-put-action';
import { storageRemoveFromList } from './lib/actions/store-remove-from-list';
import { storageRemoveValue } from './lib/actions/store-remove-value';

export const storage = createBlock({
  displayName: 'Storage',
  description: 'Store or retrieve data from key/value database',
  minimumSupportedRelease: '0.5.0',
  logoUrl: 'https://static.openops.com/blocks/store.png',
  categories: [BlockCategory.DATA],
  auth: BlockAuth.None(),
  authors: [
    'JanHolger',
    'fardeenpanjwani-codeglo',
    'Abdallah-Alwarawreh',
    'Salem-Alaa',
    'kishanprmr',
    'MoShizzle',
    'khaledmashaly',
    'abuaboud',
  ],
  actions: [
    storageGetAction,
    storagePutAction,
    storageAppendAction,
    storageRemoveValue,
    storageAddtoList,
    storageRemoveFromList,
  ],
  triggers: [],
});
