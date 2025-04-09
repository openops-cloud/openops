import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { createColumnAction } from './lib/actions/create-column';
import { createGroupAction } from './lib/actions/create-group';
import { createItemAction } from './lib/actions/create-item';
import { getBoardItemValuesAction } from './lib/actions/get-board-values';
import { getItemsColumnValuesAction } from './lib/actions/get-column-values';
import { updateColumnValuesOfItemAction } from './lib/actions/update-column-values-of-item';
import { updateItemNameAction } from './lib/actions/update-item-name';
import { uploadFileToColumnAction } from './lib/actions/upload-file-to-column';

const markdown = `
1.Log into your monday.com account.\n
2.Click on your avatar/profile picture in the top right corner.\n
3.Select **Administration** (this requires you to have admin permissions).\n
4.Go to **Connections** section.\n
5.Select **API** tab.\n
6.Copy your personal token`;

export const mondayAuth = BlockAuth.SecretText({
  displayName: 'API v2 Token',
  description: markdown,
  required: true,
});

export const monday = createBlock({
  displayName: 'monday.com',
  description: 'Work operating system for businesses',

  minimumSupportedRelease: '0.5.0',
  logoUrl: 'https://static.openops.com/blocks/monday.png',
  categories: [BlockCategory.PROJECT_MANAGEMENT],
  authors: [
    'kanarelo',
    'haseebrehmanpc',
    'kishanprmr',
    'MoShizzle',
    'AbdulTheActiveBlockr',
    'khaledmashaly',
    'abuaboud',
  ],
  auth: mondayAuth,
  actions: [
    createColumnAction,
    createGroupAction,
    createItemAction,
    getBoardItemValuesAction,
    getItemsColumnValuesAction,
    updateColumnValuesOfItemAction,
    updateItemNameAction,
    uploadFileToColumnAction,
  ],
  triggers: [],
});
