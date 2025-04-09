import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
1.  Go to the [Snowflake Login Page](https://app.snowflake.com/) and log in to your account.
2.  From the left sidebar, expand your account information located in the bottom menu.
3.  Click on the menu item labeled "**Account**" to expand a side menu.
4.  In the expanded side menu, select "**View Account Details**" (it might be listed under a heading like "Admin").
5.  On the resulting page, you will find both the **Account Identifier** and your **Username**.

For the **Password**, you will need to provide the same password you use to log in to your Snowflake account.

**Important:** Please note that providing an incorrect Account Identifier will not result in an immediate connection failure. The system will attempt to connect for approximately 5 minutes before timing out with a generic error message: "Request to Snowflake failed.". Ensure you have accurately copied your Account Identifier to avoid these delays.
`;

export const customAuth = BlockAuth.CustomAuth({
  description: markdown,
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
