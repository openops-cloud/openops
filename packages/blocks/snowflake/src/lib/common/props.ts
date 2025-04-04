import {
  BlockPropValueSchema,
  DynamicPropsValue,
  Property,
} from '@openops/blocks-framework';
import { configureConnection } from './configure-connection';
import { customAuth } from './custom-auth';
import { connect, destroy, execute } from './utils';

export const commonProps = {
  database: Property.Dropdown({
    displayName: 'Database',
    refreshers: ['auth'],
    required: true,
    options: async ({ auth }) => {
      if (!auth) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please connect your account first',
        };
      }

      const authValue = auth as BlockPropValueSchema<typeof customAuth>;

      const connection = configureConnection(authValue);

      await connect(connection);

      const response = await execute(connection, 'SHOW DATABASES', []);

      await destroy(connection);

      return {
        disabled: false,
        options: response
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.map((db: any) => {
              return {
                label: db.name,
                value: db.name,
              };
            })
          : [],
      };
    },
  }),
  schema: Property.Dropdown({
    displayName: 'Schema',
    refreshers: ['database'],
    required: true,
    options: async ({ auth, database }) => {
      if (!auth) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please connect your account first',
        };
      }
      if (!database) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please select database first',
        };
      }

      const authValue = auth as BlockPropValueSchema<typeof customAuth>;

      const connection = configureConnection(authValue);

      await connect(connection);

      const response = await execute(
        connection,
        `SHOW SCHEMAS IN DATABASE "${database}"`,
        [],
      );

      await destroy(connection);

      return {
        disabled: false,
        options: response
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.map((schema: any) => {
              return {
                label: schema.name,
                value: schema.name,
              };
            })
          : [],
      };
    },
  }),
  table: Property.Dropdown({
    displayName: 'Table',
    refreshers: ['database', 'schema'],
    required: true,
    options: async ({ auth, database, schema }) => {
      if (!auth) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please connect your account first',
        };
      }
      if (!database) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please select database first',
        };
      }
      if (!schema) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please select schema first',
        };
      }

      const authValue = auth as BlockPropValueSchema<typeof customAuth>;

      const connection = configureConnection(authValue);

      await connect(connection);

      const response = await execute(
        connection,
        `SHOW TABLES IN SCHEMA "${database}"."${schema}"`,
        [],
      );

      await destroy(connection);

      return {
        disabled: false,
        options: response
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.map((table: any) => {
              return {
                label: table.name,
                value: `"${database}"."${schema}"."${table.name}"`,
              };
            })
          : [],
      };
    },
  }),
  table_column_values: Property.DynamicProperties({
    displayName: 'Rows',
    required: true,
    refreshers: ['database', 'schema', 'table'],
    props: async ({ auth, table }) => {
      if (!auth) return {};
      if (!table) return {};

      const authValue = auth as BlockPropValueSchema<typeof customAuth>;

      const connection = configureConnection(authValue);
      await connect(connection);
      const response = await execute(connection, `DESCRIBE TABLE ${table}`, []);
      await destroy(connection);

      const fields: DynamicPropsValue = {};

      if (response) {
        for (const column of response) {
          fields[column.name] = Property.ShortText({
            displayName: column.name,
            required: false,
          });
        }
      }

      return fields;
    },
  }),
};
