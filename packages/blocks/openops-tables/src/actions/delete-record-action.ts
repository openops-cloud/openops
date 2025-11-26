import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  deleteRow,
  getFields,
  getPrimaryKeyFieldFromFields,
  getRowByPrimaryKeyValue,
  getTableIdByTableName,
  OpenOpsField,
  openopsTablesDropdownProperty,
  createTokenProvider,
  TokenOrResolver,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';
import { convertToStringWithValidation, isEmpty } from '@openops/shared';

export const deleteRecordAction = createAction({
  auth: BlockAuth.None(),
  name: 'delete_record',
  description: 'Delete a record in an OpenOps table.',
  displayName: 'Delete Record',
  isWriteAction: true,
  props: {
    tableName: openopsTablesDropdownProperty(),
    rowPrimaryKey: Property.LongText({
      displayName: 'Record Primary Key Value',
      description: '',
      required: true,
    }),
  },
  async run(context) {
    const tableName = context.propsValue.tableName as unknown as string;
    const tableCacheKey = `${context.run.id}-table-${tableName}`;
    const tableId = await cacheWrapper.getOrAdd(
      tableCacheKey,
      getTableIdByTableName,
      [tableName, context.server],
    );

    const tokenOrResolver = await createTokenProvider(context.server);

    const fieldsCacheKey = `${context.run.id}-${tableId}-fields`;
    const fields = await cacheWrapper.getOrAdd<
      OpenOpsField[],
      [number, TokenOrResolver]
    >(fieldsCacheKey, getFields, [tableId, tokenOrResolver]);

    const primaryKeyField = getPrimaryKeyFieldFromFields(fields);
    const rowPrimaryKey = getPrimaryKey(context.propsValue.rowPrimaryKey);

    const rowToDelete = await getRowByPrimaryKeyValue(
      tokenOrResolver,
      tableId,
      rowPrimaryKey,
      primaryKeyField.name,
      primaryKeyField.type,
    );
    if (!rowToDelete) {
      throw new Error('No record found with given primary key');
    }

    return await deleteRow({
      tableId: tableId,
      rowId: rowToDelete.id,
      tokenOrResolver,
    });
  },
});

function getPrimaryKey(rowPrimaryKey: any): string {
  const primaryKeyValue = convertToStringWithValidation(
    rowPrimaryKey,
    'The primary key should be a string',
  );

  if (isEmpty(primaryKeyValue)) {
    throw new Error('Record Primary Key is not defined.');
  }

  return primaryKeyValue;
}
