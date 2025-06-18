import {
  blockAuth,
  Property,
  createblock,
} from '@openops/blocks-framework';
import { blockCategory } from '@openops/shared';
import actions from './lib/actions';

export const mysqlAuth = blockAuth.CustomAuth({
  props: {
    host: Property.ShortText({
      displayName: 'Host',
      required: true,
      description: 'The hostname or address of the mysql server',
    }),
    port: Property.Number({
      displayName: 'Port',
      defaultValue: 3306,
      description: 'The port to use for connecting to the mysql server',
      required: true,
    }),
    user: Property.ShortText({
      displayName: 'Username',
      required: true,
      description: 'The username to use for connecting to the mysql server',
    }),
    password: blockAuth.SecretText({
      displayName: 'Password',
      description: 'The password to use to identify at the mysql server',
      required: true,
    }),
    database: Property.ShortText({
      displayName: 'Database',
      description: 'The name of the database to use. Required if you are not using the "Execute Query" Action',
      required: false,
    }),
  },
  required: true,
});

export const mysql = createblock({
  displayName: 'MySQL',
  description: "The world's most popular open-source database",

  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.openops.com/blocks/mysql.png',
  categories: [blockCategory.DEVELOPER_TOOLS],
  authors: ["JanHolger","kishanprmr","khaledmashaly","abuaboud"],
  auth: mysqlAuth,
  actions,
  triggers: [],
});
