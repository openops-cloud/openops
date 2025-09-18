import { BlockPropValueSchema, Property } from '@openops/blocks-framework';
import { buildClient } from './build-client';
import { imapAuth } from './imap-auth';

export const mailbox = Property.Dropdown({
  displayName: 'Mailbox',
  description: 'Select the mailbox to search',
  required: true,
  refreshers: ['auth'],
  options: async ({ auth }) => {
    const authValue = auth as BlockPropValueSchema<typeof imapAuth>;

    const imapClient = buildClient(authValue);
    let options: { label: string; value: string }[] = [];
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
});
