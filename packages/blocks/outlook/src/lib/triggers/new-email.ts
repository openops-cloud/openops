import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import { getEmails, getEmailsSince } from '../common/email-utils';
import { microsoftAuth } from '../common/outlook-auth';
import { EmailFilters } from '../common/types';

interface NewEmailProps {
  sender?: string;
  recipients?: string;
  cc?: string;
  subject?: string;
  subjectContains?: string;
}

const polling: Polling<
  BlockPropValueSchema<typeof microsoftAuth>,
  NewEmailProps
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const filters: EmailFilters = {
      sender: propsValue.sender,
      recipients: propsValue.recipients,
      cc: propsValue.cc,
      subject: propsValue.subject,
      subjectContains: propsValue.subjectContains,
    };

    const sinceDateTime = new Date(lastFetchEpochMS).toISOString();

    const emails = await getEmailsSince(
      auth.access_token,
      sinceDateTime,
      filters,
      50,
    );

    return emails.map((email) => ({
      epochMilliSeconds: new Date(email.receivedDateTime).getTime(),
      data: email,
    }));
  },
};

export const newEmailTrigger = createTrigger({
  name: 'new_email',
  displayName: 'New Email',
  description: 'Triggers when a new email is received with optional filtering',
  auth: microsoftAuth,
  type: TriggerStrategy.POLLING,
  props: {
    sender: Property.ShortText({
      displayName: 'Sender Email',
      description: 'Filter emails from a specific sender (exact match)',
      required: false,
    }),
    recipients: Property.ShortText({
      displayName: 'Recipient Email',
      description: 'Filter emails sent to a specific recipient (exact match)',
      required: false,
    }),
    cc: Property.ShortText({
      displayName: 'CC Email',
      description:
        'Filter emails where a specific email is in CC (exact match)',
      required: false,
    }),
    subject: Property.ShortText({
      displayName: 'Subject',
      description: 'Filter emails with exact subject match',
      required: false,
    }),
    subjectContains: Property.ShortText({
      displayName: 'Subject Contains',
      description: 'Filter emails where subject contains this text',
      required: false,
    }),
  },
  sampleData: {
    id: 'sample-email-id',
    subject: 'Sample Email Subject',
    bodyPreview: 'This is a preview of the email content...',
    body: {
      content: '<html><body>This is the full email content</body></html>',
      contentType: 'html',
    },
    from: {
      emailAddress: {
        address: 'sender@example.com',
        name: 'John Doe',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          address: 'recipient@example.com',
          name: 'Jane Smith',
        },
      },
    ],
    ccRecipients: [],
    bccRecipients: [],
    receivedDateTime: '2024-01-01T12:00:00Z',
    sentDateTime: '2024-01-01T11:59:00Z',
    hasAttachments: false,
    importance: 'normal',
    isRead: false,
    webLink: 'https://outlook.live.com/mail/...',
  },
  async onEnable(context) {
    await pollingHelper.onEnable(polling, context);
  },
  async onDisable(context) {
    await pollingHelper.onDisable(polling, context);
  },
  async run(context) {
    return await pollingHelper.poll(polling, context);
  },
  async test(context) {
    const filters: EmailFilters = {
      sender: context.propsValue.sender,
      recipients: context.propsValue.recipients,
      cc: context.propsValue.cc,
      subject: context.propsValue.subject,
      subjectContains: context.propsValue.subjectContains,
    };

    const emails = await getEmails(context.auth.access_token, filters, 10);

    return emails.slice(0, 3);
  },
});
