import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  createTrigger,
  TriggerStrategy,
} from '@openops/blocks-framework';
import { fetchEmails } from '../common/fetch-emails';
import { imapAuth } from '../common/imap-auth';
import { mailbox } from '../common/mailbox';

interface NewEmailProps {
  mailbox: string;
}

const polling: Polling<BlockPropValueSchema<typeof imapAuth>, NewEmailProps> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const items = await fetchEmails({
      auth,
      lastEpochMilliSeconds: lastFetchEpochMS,
      mailbox: propsValue.mailbox,
    });
    return items;
  },
};

export const newEmail = createTrigger({
  auth: imapAuth,
  name: 'new_email',
  displayName: 'New Email',
  description: 'Trigger when a new email is received.',
  props: {
    mailbox,
  },
  type: TriggerStrategy.POLLING,
  async onEnable(context) {
    await pollingHelper.onEnable(polling, context);
  },
  async onDisable(context) {
    await pollingHelper.onDisable(polling, context);
  },
  async run(context) {
    return await pollingHelper.poll(polling, context);
  },
  async test(context) {
    return await pollingHelper.test(polling, context);
  },
  sampleData: {
    receivedDateTime: '2025-09-18T09:58:26Z',
    sentDateTime: '2025-09-18T09:58:23Z',
    hasAttachments: false,
    subject: '',
    bodyPreview: 'Sample preview',
    importance: 'normal',
    isRead: true,
    body: {
      contentType: 'html',
      content: '<html><body>Sample</body></html>',
    },
    from: {
      emailAddress: {
        name: 'Sender Name',
        address: 'sender@example.com',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          name: 'Recipient Name',
          address: 'recipient@example.com',
        },
      },
    ],
    ccRecipients: [],
    bccRecipients: [],
  },
});
