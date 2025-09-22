import { pollingHelper } from '@openops/blocks-common';
import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import { imapAuth } from '../common/imap-auth';
import { mailbox } from '../common/mailbox';
import { newEmailPolling } from '../common/new-email-polling';

export const newEmail = createTrigger({
  auth: imapAuth,
  name: 'new_email',
  displayName: 'New Email',
  description: 'Trigger when a new email is received.',
  props: {
    mailbox,
    senders: Property.Array({
      displayName: 'Sender (From)',
      description: 'Matches at least one sender.',
      required: false,
    }),
    recipients: Property.Array({
      displayName: 'Recipients (To)',
      description: 'Matches at least one recipient (To).',
      required: false,
    }),
    cc: Property.Array({
      displayName: 'CC',
      description: 'Matches at least one CC address.',
      required: false,
    }),
    subject: Property.ShortText({
      displayName: 'Subject text contains',
      required: false,
    }),
  },
  type: TriggerStrategy.POLLING,
  async onEnable(context) {
    await pollingHelper.onEnable(newEmailPolling, context as any);
  },
  async onDisable(context) {
    await pollingHelper.onDisable(newEmailPolling, context as any);
  },
  async run(context) {
    return await pollingHelper.poll(newEmailPolling, context as any);
  },
  async test(context) {
    return await pollingHelper.test(newEmailPolling, context as any);
  },
  sampleData: {},
});
