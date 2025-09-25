import { DedupeStrategy, Polling } from '@openops/blocks-common';
import { BlockPropValueSchema } from '@openops/blocks-framework';
import { fetchEmails } from './fetch-emails';
import { imapAuth } from './imap-auth';

type NewEmailProps = {
  mailbox: string;
  recipients?: string[];
  cc?: string[];
  senders?: string[];
  subject?: string;
};

export const newEmailPolling: Polling<
  BlockPropValueSchema<typeof imapAuth>,
  NewEmailProps
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const items = await fetchEmails({
      auth,
      lastEpochMilliSeconds: lastFetchEpochMS,
      mailbox: propsValue.mailbox,
      recipients: propsValue.recipients,
      cc: propsValue.cc,
      senders: propsValue.senders,
      subject: propsValue.subject,
    });

    return items;
  },
};
