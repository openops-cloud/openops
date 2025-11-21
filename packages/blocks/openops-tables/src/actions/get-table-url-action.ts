import { BlockAuth, createAction } from '@openops/blocks-framework';
import {
  getDatabaseIdForBlock,
  getTableIdByTableNameFromContext,
  openopsTablesDropdownProperty,
} from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';

export const getTableUrlAction = createAction({
  auth: BlockAuth.None(),
  name: 'get_table_url',
  description: 'Get a shareable URL for the provided table.',
  displayName: 'Get Table URL',
  isWriteAction: false,
  props: {
    tableName: openopsTablesDropdownProperty(),
  },
  async run(context) {
    const tableName = context.propsValue.tableName as unknown as string;
    const tableId = await getTableIdByTableNameFromContext(tableName, context);
    const databaseId = getDatabaseIdForBlock(context);
    const baseUrl = system.getOrThrow(SharedSystemProp.FRONTEND_URL);

    return baseUrl + `/tables?path=/database/${databaseId}/table/${tableId}`;
  },
});
