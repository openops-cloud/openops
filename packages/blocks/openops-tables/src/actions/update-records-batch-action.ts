import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  batchUpdateRows,
  getFields,
  getPrimaryKeyFieldFromFields,
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
  description: 'Update multiple existing records in an OpenOps table.',
  displayName: 'Update Records Batch',
  isWriteAction: true,
  props: {
    tableName: openopsTablesDropdownProperty(),
    items: Property.Json({
      displayName: 'Items',
      required: true,
      description:
        'An array of objects with rowPrimaryKey and fields keyed by table field names.',
    }),
  },
  async run(context) {
    const tableName = context.propsValue.tableName as unknown as string;
    const items = context.propsValue.items as unknown;

    if (!Array.isArray(items)) {
      throw new Error(
        'Items must be an array of objects with rowPrimaryKey and fields.',
      );
    }

    if (
      items.some(
        (item) =>
          item === null ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          typeof item.rowPrimaryKey !== 'string' ||
          item.rowPrimaryKey.trim() === '' ||
          item.fields === null ||
          typeof item.fields !== 'object' ||
          Array.isArray(item.fields),
      )
    ) {
      throw new Error(
        'Each item must include a non-empty string rowPrimaryKey and an object fields value.',
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
    const tableFields = await cacheWrapper.getOrAdd<
      OpenOpsField[],
      [number, TokenOrResolver]
    >(fieldsCacheKey, getFields, [tableId, tokenOrResolver]);
    const primaryKeyField = getPrimaryKeyFieldFromFields(tableFields);

    return await batchUpdateRows({
      tableId,
      tokenOrResolver,
      primaryKeyFieldName: primaryKeyField.name,
      items: items as {
        rowPrimaryKey: string;
        fields: { [key: string]: any };
      }[],
    });
  },
});
