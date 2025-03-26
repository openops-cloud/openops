import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import {
  authenticateDefaultUserInOpenOpsTables,
  deleteRow,
  getFields,
  getPrimaryKeyFieldFromFields,
  getRowByPrimaryKeyValue,
  getTableIdByTableName,
  openopsTablesDropdownProperty,
} from '@openops/common';
import { cacheWrapper } from '@openops/server-shared';
import { convertToStringWithValidation, isEmpty } from '@openops/shared';

export const deleteRecordAction = createAction({
  auth: BlockAuth.None(),
  name: 'delete_record',
  description: 'Delete a record in an OpenOps table.',
  displayName: 'Delete Record',
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
      [tableName],
    );

    const { token } = await authenticateDefaultUserInOpenOpsTables();

    const fieldsCacheKey = `${context.run.id}-${tableId}-fields`;
    const fields = await cacheWrapper.getOrAdd(fieldsCacheKey, getFields, [
      tableId,
      token,
    ]);

    const primaryKeyField = getPrimaryKeyFieldFromFields(fields);
    const rowPrimaryKey = getPrimaryKey(context.propsValue.rowPrimaryKey);

    const rowToDelete = await getRowByPrimaryKeyValue(
      token,
      tableId,
      rowPrimaryKey,
      primaryKeyField.name,
    );
    if (!rowToDelete) {
      throw new Error('No record found with given primary key');
    }

    return await deleteRow({
      tableId: tableId,
      token: token,
      rowId: rowToDelete.id,
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
