import {
  createTrigger,
  FilesService,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import { ImapFlow } from 'imapflow';
import { ParsedMail } from 'mailparser';
import { imapAuth } from '../..';
import { convertAttachment, imapCommon } from '../common';

const filterInstructions = `
**Filter Emails:**

You can add Branch Piece to filter emails based on the subject, to, from, cc or other fields.
`;

export const newEmail = createTrigger({
  auth: imapAuth,
  name: 'new_email',
  displayName: 'New Email',
  description: 'Trigger when a new email is received.',
  props: {
    mailbox: Property.Dropdown({
      displayName: 'Mailbox',
      description: 'Select the mailbox to search',
      required: true,
      refreshers: ['auth'],
      options: async ({ auth }: any) => {
        console.log('THIS IS OPTIONS', auth);
        console.log('THIS IS OPTIONS B', auth);
        const imapConfig = imapCommon.constructConfig(
          auth as {
            host: string;
            username: string;
            password: string;
            port: number;
            tls: boolean;
          },
        );
        let options: { label: string; value: string }[] = [];
        const imapClient = new ImapFlow({ ...imapConfig, logger: console });
        try {
          await imapClient.connect();
          const mailBoxList = await imapClient.list();
          options = mailBoxList.map((mailbox) => {
            return {
              label: mailbox.name,
              value: mailbox.path,
            };
          });
        } finally {
          await imapClient.logout();
        }
        return {
          disabled: false,
          options: options,
        };
      },
    }),
  },
  type: TriggerStrategy.POLLING,
  onEnable: async (context) => {
    await context.store.put('lastPoll', Date.now());
  },
  onDisable: async (context) => {
    await context.store.delete('lastPoll');
    return;
  },
  run: async (context) => {
    const { auth, store, propsValue, files } = context;
    const mailbox = propsValue.mailbox;
    const lastEpochMilliSeconds = (await store.get<number>('lastPoll')) ?? 0;
    const items = await imapCommon.fetchEmails({
      auth,
      lastEpochMilliSeconds,
      mailbox,
      files,
    });
    const newLastEpochMilliSeconds = items.reduce(
      (acc, item) => Math.max(acc, item.epochMilliSeconds),
      lastEpochMilliSeconds,
    );
    await store.put('lastPoll', newLastEpochMilliSeconds);
    const filteredEmail = items.filter(
      (f) => f.epochMilliSeconds > lastEpochMilliSeconds,
    );
    return filteredEmail;
  },
  test: async (context) => {
    const { auth, propsValue, files } = context;
    const mailbox = propsValue.mailbox;
    const lastEpochMilliSeconds = 0;
    const items = await imapCommon.fetchEmails({
      auth,
      lastEpochMilliSeconds,
      mailbox,
      files,
    });
    const filteredEmails = getFirstFiveOrAll(items);
    return filteredEmails;
  },
  sampleData: {
    html: 'My email body',
    text: 'My email body',
    textAsHtml: '<p>My email body</p>',
    subject: 'Email Subject',
    date: '2023-06-18T11:30:09.000Z',
    to: {
      value: [
        {
          address: 'email@address.com',
          name: 'Name',
        },
      ],
    },
    from: {
      value: [
        {
          address: 'email@address.com',
          name: 'Name',
        },
      ],
    },
    cc: {
      value: [
        {
          address: 'email@address.com',
          name: 'Name',
        },
      ],
    },
    messageId:
      '<CxE49ifJT5YZN9OE2O6j6Ef+BYgkKWq7X-deg483GkM1ui1xj3g@mail.gmail.com>',
  },
});

function getFirstFiveOrAll<T>(array: T[]) {
  if (array.length <= 5) {
    return array;
  } else {
    return array.slice(0, 5);
  }
}
