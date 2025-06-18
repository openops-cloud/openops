import {
  blockPropValueSchema,
  createblock,
  blockAuth,
  Property,
} from '@openops/blocks-framework';
import { blockCategory } from '@openops/shared';
import { propsValidation } from '@openops/blocks-common';
import { z } from 'zod';

import actions from './lib/actions';
import { mongodbConnect } from './lib/common';

export const mongodbAuth = blockAuth.CustomAuth({
  validate: async ({ auth }) => {
    try {
      await validateAuth(auth);
      return {
        valid: true,
      };
    } catch (e) {
      return {
        valid: false,
        error: (e as Error)?.message,
      };
    }
  },
  props: {
    host: Property.ShortText({
      displayName: 'Host',
      required: true,
      description:
        'The hostname or address of the MongoDB server (e.g., localhost:27017 or cluster.example.mongodb.net)',
    }),
    useAtlasUrl: Property.Checkbox({
      displayName: 'Use MongoDB Atlas URL Format',
      description:
        'Enable this if connecting to MongoDB Atlas (uses mongodb+srv:// protocol)',
      required: true,
      defaultValue: false,
    }),
    database: Property.ShortText({
      displayName: 'Database',
      required: false,
      description:
        'The MongoDB database to connect to (can be specified per action if left empty)',
    }),
    username: Property.ShortText({
      displayName: 'Username',
      required: true,
      description: 'The username to use for connecting to the MongoDB server',
    }),
    password: blockAuth.SecretText({
      displayName: 'Password',
      description: 'The password to use to identify at the MongoDB server',
      required: true,
    }),
    authSource: Property.ShortText({
      displayName: 'Auth Source',
      required: false,
      description: 'The database to authenticate against (default: admin)',
      defaultValue: 'admin',
    }),
  },
  required: true,
});

const validateAuth = async (auth: blockPropValueSchema<typeof mongodbAuth>) => {
  await propsValidation.validateZod(auth, {
    host: z.string().min(1),
    useAtlasUrl: z.boolean(),
    database: z.string().optional(),
    username: z.string().min(1),
    password: z.string().optional(),
    authSource: z.string().optional(),
  });

  const client = await mongodbConnect(auth);

  await client.db('admin').command({ ping: 1 });

  await client.close();

  console.log('MongoDB validation successful');
};

export const mongodb = createblock({
  displayName: 'MongoDB',
  auth: mongodbAuth,
  minimumSupportedRelease: '0.36.1',
  categories: [blockCategory.DEVELOPER_TOOLS],
  logoUrl: 'https://cdn.openops.com/blocks/mongodb.png',
  authors: ['denieler'],
  actions,
  triggers: [],
});
