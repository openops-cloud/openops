import { createAction } from '@openops/blocks-framework';
import { configureConnection } from '../common/configure-connection';
import { customAuth } from '../common/custom-auth';
import { commonProps } from '../common/props';
import { connect, destroy, execute } from '../common/utils';

const { database, schema, table, table_column_values } = commonProps;

const props = {
  database,
  schema,
  table,
  table_column_values,
};

export const insertRow = createAction({
  name: 'insertRow',
  displayName: 'Insert Row',
  description: 'Insert a row into a table.',
  auth: customAuth,
  props,
  async run(context) {
    const tableName = context.propsValue.table;
    const tableColumnValues = context.propsValue.table_column_values;

    const columns = Object.keys(tableColumnValues).join(',');
    const valuePlaceholders = Object.keys(tableColumnValues)
      .map(() => '?')
      .join(', ');
    const statement = `INSERT INTO ${tableName}(${columns}) VALUES(${valuePlaceholders})`;

    const connection = configureConnection(context.auth);
    await connect(connection);

    const response = await execute(
      connection,
      statement,
      Object.values(tableColumnValues),
    );
    await destroy(connection);

    return response;
  },
});
