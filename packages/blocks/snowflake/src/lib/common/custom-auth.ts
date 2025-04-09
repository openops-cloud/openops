import { HttpError } from '@openops/blocks-common';
import { BlockAuth, Property, Validators } from '@openops/blocks-framework';
import { configureConnection } from './configure-connection';
import { connect } from './utils';

const markdown = `
1.  Go to the [Snowflake Login Page](https://app.snowflake.com/) and log in to your account.
2.  From the left sidebar, expand your account information located in the bottom menu.
3.  Click on the menu item labeled "**Account**" to expand a side menu.
4.  In the expanded side menu, select "**View Account Details**" (it might be listed under a heading like "Admin").
5.  On the resulting page, you will find both the **Account Identifier** and your **Username**.

For the **Password**, you will need to provide the same password you use to log in to your Snowflake account.

If you're experiencing delays, double-check that your **Account Identifier** is correct. An incorrect identifier combined with an increased **Max Login Retries** value will cause the system to repeatedly try connecting, resulting in longer wait times before it eventually fails with the error: "Request to Snowflake failed."
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
    maxLoginRetries: Property.Number({
      displayName: 'Max Login Retries',
      description: 'The maximum number of times to retry login',
      required: true,
      defaultValue: 2,
      validators: [
        Validators.number,
        Validators.minValue(0),
        Validators.maxValue(7),
      ],
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
  validate: async ({ auth }) => {
    const connection = configureConnection(auth);
    try {
      await connect(connection);

      return {
        valid: true,
      };
    } catch (e) {
      return {
        valid: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: ((e as HttpError).response.body as any).message,
      };
    }
  },
});
