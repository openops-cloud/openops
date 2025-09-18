import { BlockPropValueSchema } from '@openops/blocks-framework';
import dayjs from 'dayjs';
import { ParsedMail, simpleParser } from 'mailparser';
import { buildClient } from './build-client';
import { imapAuth } from './imap-auth';

export async function fetchEmails({
  auth,
  lastEpochMilliSeconds,
  mailbox,
}: {
  auth: BlockPropValueSchema<typeof imapAuth>;
  lastEpochMilliSeconds: number;
  mailbox: string;
}): Promise<
  {
    data: ParsedMail;
    epochMilliSeconds: number;
  }[]
> {
  const imapClient = buildClient(auth);
  await imapClient.connect();
  const lock = await imapClient.getMailboxLock(mailbox);
  try {
    const res = imapClient.fetch(
      {
        since:
          lastEpochMilliSeconds === 0
            ? dayjs().subtract(2, 'hour').toISOString()
            : dayjs(lastEpochMilliSeconds).toISOString(),
      },
      {
        source: true,
      },
    );
    const messages: { data: ParsedMail; epochMilliSeconds: number }[] = [];
    for await (const message of res) {
      if (message.source) {
        const castedItem = await parseStream(message.source);
        messages.push({
          data: castedItem,
          epochMilliSeconds: dayjs(castedItem.date).valueOf(),
        });
      }
    }
    return messages;
  } finally {
    lock.release();
    await imapClient.logout();
  }
}

async function parseStream(stream: Buffer) {
  return new Promise<ParsedMail>((resolve, reject) => {
    simpleParser(stream, (err, parsed) => {
      if (err) {
        reject(err);
      } else {
        resolve(parsed);
      }
    });
  });
}
