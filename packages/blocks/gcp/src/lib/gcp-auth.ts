import { BlockAuth, Property } from '@openops/blocks-framework';

export type GCPCredentials = {
  keyFileContent: string;
};

export const gcpAuth = BlockAuth.CustomAuth({
  props: {
    keyFileContent: Property.LongText({
      displayName: 'a',
      required: true,
      description: 'b',
    }),
  },
  required: true,
});
