import { BlockAuth, Property } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { buildClient } from './build-client';

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
    const imapClient = buildClient(auth);
    try {
      await imapClient.connect();
      await imapClient.noop();
      return { valid: true };
    } catch (error) {
      logger.warn(`Failed to connect to IMAP`, {
        error,
      });
      return {
        valid: false,
        error: 'Failed to validate IMAP connection',
      };
    } finally {
      await imapClient.logout();
    }
  },
});
