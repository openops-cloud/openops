import { BlockAuth } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';

const enableHostSession =
  system.getBoolean(SharedSystemProp.ENABLE_HOST_SESSION) ?? false;

export const googleCloudAuth = BlockAuth.CustomAuth({
  props: {
    keyFileContent: BlockAuth.SecretText({
      displayName: 'Key file content',
      description: 'Provide the content of the service-account key file.',
      required: true,
    }),
  },
  required: !enableHostSession,
});
