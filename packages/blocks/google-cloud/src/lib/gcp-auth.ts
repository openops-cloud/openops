import { BlockAuth, Property, WorkflowFile } from '@openops/blocks-framework';

export type GCPCredentials = {
  keyFile: WorkflowFile;
};

export const googleCloudAuth = BlockAuth.CustomAuth({
  props: {
    keyFile: Property.File({
      displayName: 'File',
      description: 'Upload a file',
      required: true,
    }),
  },
  required: true,
});
