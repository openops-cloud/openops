import { BlockAuth } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';

const enableHostSession =
  system.getBoolean(SharedSystemProp.ENABLE_HOST_SESSION) ?? false;

const markdown = `
1. Log into Google Cloud console.\n
2. Go to **IAM and admin**.\n
3. On the left sidebar, click on **Service accounts**.\n
4. Create a new service account and grant it permissions for the relevant projects, or select an existing service account.\n
5. After selecting the service account, click on the tab **Keys**, and create a new JSON key.\n
6. Open the downloaded file, and copy the content.\n
7. Paste the content in the field below.\n

You can also visit [OpenOps documentation](https://docs.openops.com/introduction/overview) for more information.`;

export const googleCloudAuth = BlockAuth.CustomAuth({
  description: markdown,
  props: {
    keyFileContent: BlockAuth.SecretText({
      displayName: 'Key file content',
      description: 'Provide the content of the service-account key file.',
      required: true,
    }),
  },
  required: !enableHostSession,
});
