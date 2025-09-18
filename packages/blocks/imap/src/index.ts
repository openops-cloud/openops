import { BlockAuth, createBlock, Property } from '@openops/blocks-framework';
import { BlockCategory } from '@openops/shared';
import { ImapFlow } from 'imapflow';
import { imapCommon } from './lib/common';
import { newEmail } from './lib/triggers/new-email';

export const imapAuth = BlockAuth.CustomAuth({
  authProviderKey: 'imap',
  authProviderDisplayName: 'IMAP',
  authProviderLogoUrl: 'https://static.openops.com/blocks/imap.png',
  required: true,
  props: {
    host: Property.ShortText({
      displayName: 'Host',
      required: true,
    }),
    username: Property.ShortText({
      displayName: 'Username',
      required: true,
    }),
    password: Property.SecretText({
      displayName: 'Password',
      required: true,
    }),
    port: Property.Number({
      displayName: 'Port',
      required: true,
      defaultValue: 143,
    }),
    tls: Property.Checkbox({
      displayName: 'Use TLS',
      defaultValue: false,
      required: true,
    }),
  },
  validate: async ({ auth }) => {
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
    try {
      await imapClient.connect();
      await imapClient.noop();
      return { valid: true };
    } catch (e) {
      return {
        valid: false,
        error: JSON.stringify(e),
      };
    } finally {
      await imapClient.logout();
    }
  },
});

export const imapBlock = createBlock({
  displayName: 'IMAP',
  description: 'Receive new email trigger',
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://static.openops.com/blocks/imap.pnh',
  categories: [BlockCategory.COLLABORATION],
  authors: [],
  auth: imapAuth,
  actions: [],
  triggers: [newEmail],
});
