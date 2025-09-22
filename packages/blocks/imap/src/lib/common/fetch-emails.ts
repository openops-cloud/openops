import { BlockPropValueSchema } from '@openops/blocks-framework';
import dayjs from 'dayjs';
import { SearchObject } from 'imapflow';
import { ParsedMail, simpleParser } from 'mailparser';
import { buildClient } from './build-client';
import { imapAuth } from './imap-auth';

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
  await imapClient.connect();
  const lock = await imapClient.getMailboxLock(mailbox);
  try {
    const sinceISO =
      lastEpochMilliSeconds !== 0
        ? dayjs().subtract(2, 'hour').toISOString()
        : '';

    const recipientList = (recipients || []).map((s) => s.toLowerCase().trim());
    const ccList = (cc || []).map((s) => s.toLowerCase().trim());
    const senderList = (senders || []).map((s) => s.toLowerCase().trim());

    const search: SearchObject = { since: sinceISO };

    type Clause = SearchObject;
    let clauses: Clause[] = [{}];

    if (recipientList.length > 0) {
      const next: Clause[] = [];
      for (const base of clauses) {
        for (const toAddr of recipientList) {
          next.push({ ...base, to: toAddr });
        }
      }
      clauses = next;
    }

    if (ccList.length > 0) {
      const next: Clause[] = [];
      for (const base of clauses) {
        for (const ccAddr of ccList) {
          next.push({ ...base, cc: ccAddr });
        }
      }
      clauses = next;
    }

    if (senderList.length > 0) {
      const next: Clause[] = [];
      for (const base of clauses) {
        for (const fromAddr of senderList) {
          next.push({ ...base, from: fromAddr });
        }
      }
      clauses = next;
    }

    const trimmedSubject = subject?.trim();
    if (trimmedSubject) {
      search.subject = trimmedSubject;
    }

    const hasConstraints =
      recipientList.length > 0 || ccList.length > 0 || senderList.length > 0;

    if (hasConstraints) {
      if (clauses.length === 1) {
        Object.assign(search, clauses[0]);
      } else {
        search.or = clauses;
      }
    }

    const res = imapClient.fetch(search, { source: true });

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
