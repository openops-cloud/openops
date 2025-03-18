import { BlockAuth, createAction } from '@openops/blocks-framework';
import {
  getTableIdByTableName,
  openopsTablesDropdownProperty,
} from '@openops/common';
import { SharedSystemProp, system } from '@openops/server-shared';

const DEFAULT_DATABASE_ID = 1;

export const getTableUrlAction = createAction({
  auth: BlockAuth.None(),
  name: 'get_table_url',
  description: 'Get a shareable URL for the provided table.',
  displayName: 'Get Table URL',
  props: {
    tableName: openopsTablesDropdownProperty(),
  },
  async run(context) {
    const tableName = context.propsValue.tableName as unknown as string;
    const tableId = await getTableIdByTableName(tableName);
    const baseUrl = system.getOrThrow(SharedSystemProp.FRONTEND_URL);

    return (
      baseUrl + `/tables?path=/database/${DEFAULT_DATABASE_ID}/table/${tableId}`
    );
  },
});
