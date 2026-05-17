import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  batchUpdateRows,
  getFields,
  getTableIdByTableName,
  OpenOpsField,
  openopsTablesDropdownProperty,
  resolveTokenProvider,
  TokenOrResolver,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';

export const updateRecordsBatchAction = createAction({
  auth: BlockAuth.None(),
  name: 'update_records_batch',
  description:
    'Update multiple existing records in an OpenOps table. Note: rowId must be the internal Baserow row ID (integer from the "ID" field), not a custom primary key.',
  displayName: 'Update Records Batch',
  isWriteAction: true,
  props: {
    tableName: openopsTablesDropdownProperty(),
    items: Property.Json({
      displayName: 'Items',
      required: true,
      description:
        'An array of objects with rowId (Baserow internal row ID as integer) and fields keyed by table field names. Example: [{ rowId: 123, fields: { Owner: "user@example.com" } }]',
    }),
  },
  async run(context) {
    const tableName = context.propsValue.tableName as unknown as string;
    const items = context.propsValue.items as unknown;

    if (!Array.isArray(items)) {
      throw new Error(
        'Items must be an array of objects with rowId and fields.',
      );
    }

    if (
      items.some(
        (item) =>
          item === null ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          typeof item.rowId !== 'number' ||
          !Number.isInteger(item.rowId) ||
          item.fields === null ||
          typeof item.fields !== 'object' ||
          Array.isArray(item.fields),
      )
    ) {
      throw new Error(
        'Each item must include an integer rowId and an object fields value.',
      );
    }

    const tableCacheKey = `${context.run.id}-table-${tableName}`;
    const tableId = await cacheWrapper.getOrAdd(
      tableCacheKey,
      getTableIdByTableName,
      [tableName, context.server],
    );

    const tokenOrResolver = await resolveTokenProvider(context.server);
    const fieldsCacheKey = `${context.run.id}-${tableId}-fields`;
    await cacheWrapper.getOrAdd<OpenOpsField[], [number, TokenOrResolver]>(
      fieldsCacheKey,
      getFields,
      [tableId, tokenOrResolver],
    );

    return await batchUpdateRows({
      tableId,
      tokenOrResolver,
      items: items as {
        rowId: number;
        fields: { [key: string]: any };
      }[],
    });
  },
});
