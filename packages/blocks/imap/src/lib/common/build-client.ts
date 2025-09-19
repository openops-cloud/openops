import { BlockPropValueSchema } from '@openops/blocks-framework';
import { ImapFlow } from 'imapflow';
import { imapAuth } from './imap-auth';

export function buildClient(auth: BlockPropValueSchema<typeof imapAuth>) {
  return new ImapFlow({
    host: auth.host,
    port: auth.port,
    secure: auth.tls,
    auth: { user: auth.username, pass: auth.password },
    tls: { rejectUnauthorized: false },
    logger: false,
  });
}
