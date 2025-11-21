import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  deleteRow,
  getFieldsFromContext,
  getPrimaryKeyFieldFromFields,
  getRowByPrimaryKeyValue,
  getTableIdByTableNameFromContext,
  getTokenForBlock,
  openopsTablesDropdownProperty,
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
      getTableIdByTableNameFromContext,
      [tableName, context],
    );

    const { token, useDatabaseToken } = await getTokenForBlock(context);

    const fieldsCacheKey = `${context.run.id}-${tableId}-fields`;
    const fields = await cacheWrapper.getOrAdd(
      fieldsCacheKey,
      getFieldsFromContext,
      [tableId, context],
    );

    const primaryKeyField = getPrimaryKeyFieldFromFields(fields);
    const rowPrimaryKey = getPrimaryKey(context.propsValue.rowPrimaryKey);

    const rowToDelete = await getRowByPrimaryKeyValue(
      token,
      tableId,
      rowPrimaryKey,
      primaryKeyField.name,
      primaryKeyField.type,
      useDatabaseToken,
    );
    if (!rowToDelete) {
      throw new Error('No record found with given primary key');
    }

    return await deleteRow({
      tableId: tableId,
      token: token,
      rowId: rowToDelete.id,
      useDatabaseToken,
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
