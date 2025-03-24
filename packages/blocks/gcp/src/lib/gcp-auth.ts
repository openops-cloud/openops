import { BlockAuth, Property } from '@openops/blocks-framework';

export type GCPCredentials = {
  keyFileContent: string;
};

export const gcpAuth = BlockAuth.CustomAuth({
  props: {
    keyFileContent: Property.LongText({
      displayName: 'Key file content',
      required: true,
      description: 'the content of the key file',
    }),
  },
  required: true,
});
