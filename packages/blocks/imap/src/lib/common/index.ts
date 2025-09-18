import { BlockPropValueSchema, FilesService } from '@openops/blocks-framework';
import { ImapFlow } from 'imapflow';
import { imapAuth } from '../../';

import dayjs from 'dayjs';
import { Attachment, ParsedMail, simpleParser } from 'mailparser';

export const imapCommon = {
  constructConfig(auth: {
    host: string;
    username: string;
    password: string;
    port: number;
    tls: boolean;
  }) {
    return {
      host: auth.host,
      port: auth.port,
      secure: auth.tls,
      auth: { user: auth.username, pass: auth.password },
      tls: { rejectUnauthorized: false },
    };
  },

  async fetchEmails({
    auth,
    lastEpochMilliSeconds,
    mailbox,
  }: {
    auth: BlockPropValueSchema<typeof imapAuth>;
    lastEpochMilliSeconds: number;
    mailbox: string;
    files: FilesService;
  }): Promise<
    {
      data: ParsedMail;
      epochMilliSeconds: number;
    }[]
  > {
    const imapConfig = imapCommon.constructConfig(
      auth as {
        host: string;
        username: string;
        password: string;
        port: number;
        tls: boolean;
      },
    );
    const imapClient = new ImapFlow({ ...imapConfig, logger: false });
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
      const messages = [];
      for await (const message of res) {
        const castedItem = await parseStream(message.source);
        messages.push({
          data: castedItem,
          epochMilliSeconds: dayjs(castedItem.date).valueOf(),
        });
      }
      return messages;
    } finally {
      lock.release();
      await imapClient.logout();
    }
  },
};

export async function convertAttachment(
  attachments: Attachment[],
  files: FilesService,
) {
  const promises = attachments.map(async (attachment) => {
    return files.write({
      fileName: attachment.filename ?? `attachment-${Date.now()}`,
      data: attachment.content,
    });
  });
  return Promise.all(promises);
}

async function parseStream(stream: any) {
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
