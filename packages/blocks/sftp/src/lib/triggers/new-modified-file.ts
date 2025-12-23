import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import dayjs from 'dayjs';
import Client from 'ssh2-sftp-client';
import { sftpAuth } from '../..';

const polling: Polling<
  BlockPropValueSchema<typeof sftpAuth>,
  { path: string; ignoreHiddenFiles?: boolean }
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, propsValue, lastFetchEpochMS }) => {
    const host = auth.host;
    const port = auth.port;
    const username = auth.username;
    const password = auth.password;

    const sftp = new Client();

    try {
      await sftp.connect({
        host,
        port,
        username,
        password,
      });

      let files = await sftp.list(propsValue.path);
      await sftp.end();
      files = files.filter(
        (file) => dayjs(file.modifyTime).valueOf() > lastFetchEpochMS,
      );
      if ((propsValue.ignoreHiddenFiles ?? false) === true)
        files = files.filter((file) => !file.name.startsWith('.'));

      return files.map((file) => ({
        data: {
          ...file,
          path: `${propsValue.path}/${file.name}`,
        },
        epochMilliSeconds: dayjs(file.modifyTime).valueOf(),
      }));
    } catch (err) {
      return [];
    }
  },
};

export const newOrModifiedFile = createTrigger({
  auth: sftpAuth,
  name: 'new_file',
  displayName: 'New File',
  description: 'Trigger when a new file is created or modified',
  props: {
    path: Property.ShortText({
      displayName: 'Path',
      description: 'The path to watch for new files',
      required: true,
      defaultValue: './',
    }),
    ignoreHiddenFiles: Property.Checkbox({
      displayName: 'Ignore Hidden Files',
      description: 'Skip files that start with a dot',
      required: false,
      defaultValue: false,
    }),
  },
  type: TriggerStrategy.POLLING,
  onEnable: async (context) => {
    await pollingHelper.onEnable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  onDisable: async (context) => {
    await pollingHelper.onDisable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  run: async (context) => {
    return await pollingHelper.poll(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  test: async (context) => {
    return await pollingHelper.test(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  sampleData: {},
});
