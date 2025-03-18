import { BlockAuth, createBlock } from '@openops/blocks-framework';
import { deleteRecordAction } from './actions/delete-record-action';
import { getRecordsAction } from './actions/get-records-action';
import { getTableUrlAction } from './actions/get-table-url-action';
import { updateRecordAction } from './actions/update-record-action';

export const openopsTables = createBlock({
  displayName: 'OpenOps Tables',
  auth: BlockAuth.None(),
  minimumSupportedRelease: '0.20.0',
  logoUrl: 'https://static.openops.com/blocks/tables.svg',
  authors: [],
  actions: [
    getRecordsAction,
    updateRecordAction,
    deleteRecordAction,
    getTableUrlAction,
  ],
  triggers: [],
});
