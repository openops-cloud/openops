import { BlockAuth, Property } from '@openops/blocks-framework';

export const customAuth = BlockAuth.CustomAuth({
  props: {
    account: Property.ShortText({
      displayName: 'Account',
      required: true,
      description: 'A string indicating the Snowflake account identifier.',
    }),
    username: Property.ShortText({
      displayName: 'Username',
      required: true,
      description: 'The login name for your Snowflake user.',
    }),
    password: BlockAuth.SecretText({
      displayName: 'Password',
      description: 'Password for the user.',
      required: true,
    }),
    database: Property.ShortText({
      displayName: 'Database',
      description:
        'The default database to use for the session after connecting.',
      required: false,
    }),
    role: Property.ShortText({
      displayName: 'Role',
      description:
        'The default security role to use for the session after connecting.',
      required: false,
    }),
    warehouse: Property.ShortText({
      displayName: 'Warehouse',
      description:
        'The default virtual warehouse to use for the session after connecting. Used for performing queries, loading data, etc.',
      required: false,
    }),
  },
  required: true,
});
