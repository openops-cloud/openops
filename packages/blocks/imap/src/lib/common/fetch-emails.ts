import { BlockPropValueSchema } from '@openops/blocks-framework';
import dayjs from 'dayjs';
import { MailboxLockObject } from 'imapflow';
import { ParsedMail } from 'mailparser';
import { buildClient } from './build-client';
import { buildImapSearch } from './build-search';
import { imapAuth } from './imap-auth';
import { parseMailFromBuffer } from './parse-mail';

export async function fetchEmails({
  auth,
  lastEpochMilliSeconds,
  mailbox,
  recipients,
  cc,
  senders,
  subject,
}: {
  auth: BlockPropValueSchema<typeof imapAuth>;
  lastEpochMilliSeconds: number;
  mailbox: string;
  recipients?: string[];
  cc?: string[];
  senders?: string[];
  subject?: string;
}): Promise<
  {
    data: ParsedMail;
    epochMilliSeconds: number;
  }[]
> {
  const imapClient = buildClient(auth);
  let lock: MailboxLockObject | undefined = undefined;
  try {
    await imapClient.connect();
    lock = await imapClient.getMailboxLock(mailbox);
    const search = buildImapSearch({
      lastEpochMilliSeconds,
      recipients,
      cc,
      senders,
      subject,
    });

    const res = imapClient.fetch(search, { source: true });

    const messages: { data: ParsedMail; epochMilliSeconds: number }[] = [];
    for await (const message of res) {
      if (message.source) {
        const castedItem = await parseMailFromBuffer(message.source);
        messages.push({
          data: castedItem,
          epochMilliSeconds: dayjs(castedItem.date).valueOf(),
        });
      }
    }
    return messages;
  } finally {
    if (lock) {
      lock.release();
    }
    await imapClient.logout();
  }
}
