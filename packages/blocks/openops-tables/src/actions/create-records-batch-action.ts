import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  createRowsBatch,
  getTableIdByTableName,
  openopsTablesDropdownProperty,
  resolveTokenProvider,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';

export const createRecordsBatchAction = createAction({
  auth: BlockAuth.None(),
  name: 'create_records_batch',
  description: 'Create multiple records in an OpenOps table.',
  displayName: 'Create Records Batch',
  isWriteAction: true,
  props: {
    tableName: openopsTablesDropdownProperty(),
    items: Property.Json({
      displayName: 'Items',
      required: true,
      description: 'An array of row objects keyed by table field names.',
    }),
  },
  async run(context) {
    const tableName = context.propsValue.tableName as unknown as string;
    const items = context.propsValue.items as unknown;

    if (!Array.isArray(items)) {
      throw new Error('Items must be an array of row objects.');
    }

    if (
      items.some(
        (item) =>
          item === null || typeof item !== 'object' || Array.isArray(item),
      )
    ) {
      throw new Error(
        'Each item must be an object keyed by table field names.',
      );
    }

    const tableCacheKey = `${context.run.id}-table-${tableName}`;
    const tableId = await cacheWrapper.getOrAdd(
      tableCacheKey,
      getTableIdByTableName,
      [tableName, context.server],
    );

    const tokenOrResolver = await resolveTokenProvider(context.server);

    return await createRowsBatch({
      tableId,
      tokenOrResolver,
      items: items as { [key: string]: any }[],
    });
  },
});
