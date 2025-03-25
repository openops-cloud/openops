import { BlockAuth } from '@openops/blocks-framework';

export const googleCloudAuth = BlockAuth.CustomAuth({
  props: {
    keyFileContent: BlockAuth.SecretText({
      displayName: 'Key file content',
      description: 'Provide the content of the service-account key file.',
      required: true,
    }),
  },
  required: true,
});
