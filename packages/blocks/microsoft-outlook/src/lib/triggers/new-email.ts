import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { Message } from '@microsoft/microsoft-graph-types';
import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import dayjs from 'dayjs';
import { microsoftOutlookAuth } from '../common/auth';

interface FilterProps {
  senderEmail?: string;
  recipientEmail?: string;
  ccEmail?: string;
  subjectContains?: string;
  subjectIs?: string;
}

const polling: Polling<
  BlockPropValueSchema<typeof microsoftOutlookAuth>,
  FilterProps
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: () => Promise.resolve(auth.access_token),
      },
    });

    const messages = [];

    const timeFilter =
      lastFetchEpochMS === 0
        ? ''
        : `receivedDateTime gt ${dayjs(lastFetchEpochMS).toISOString()}`;

    const filterParam = timeFilter ? `$filter=${timeFilter}` : '';
    const topParam = '$top=50';

    const queryParams = [filterParam, topParam].filter(Boolean).join('&');
    const url = `/me/mailFolders/inbox/messages${
      queryParams ? `?${queryParams}` : ''
    }`;

    let response: PageCollection;
    try {
      response = await client.api(url).orderby('receivedDateTime desc').get();
    } catch (error) {
      response = await client
        .api('/me/mailFolders/inbox/messages?$top=50')
        .orderby('receivedDateTime desc')
        .get();
    }

    if (lastFetchEpochMS === 0) {
      for (const message of response.value as Message[]) {
        messages.push(message);
      }
    } else {
      while (response.value.length > 0) {
        for (const message of response.value as Message[]) {
          messages.push(message);
        }

        if (response['@odata.nextLink']) {
          response = await client.api(response['@odata.nextLink']).get();
        } else {
          break;
        }
      }
    }

    const filteredMessages = messages.filter((message: Message) => {
      if (propsValue?.senderEmail) {
        const senderAddress =
          message.from?.emailAddress?.address?.toLowerCase();
        if (
          !senderAddress ||
          !senderAddress.includes(propsValue.senderEmail.toLowerCase())
        ) {
          return false;
        }
      }

      if (propsValue?.recipientEmail) {
        const recipientAddresses =
          message.toRecipients?.map((r) =>
            r.emailAddress?.address?.toLowerCase(),
          ) || [];
        if (
          !recipientAddresses.some((addr) =>
            addr?.includes(propsValue.recipientEmail?.toLowerCase() || ''),
          )
        ) {
          return false;
        }
      }

      if (propsValue?.ccEmail) {
        const ccAddresses =
          message.ccRecipients?.map((c) =>
            c.emailAddress?.address?.toLowerCase(),
          ) || [];
        if (
          !ccAddresses.some((addr) =>
            addr?.includes(propsValue.ccEmail?.toLowerCase() || ''),
          )
        ) {
          return false;
        }
      }

      if (propsValue?.subjectIs) {
        const subject = message.subject?.toLowerCase() || '';
        if (subject !== propsValue.subjectIs.toLowerCase()) {
          return false;
        }
      }

      if (propsValue?.subjectContains) {
        const subject = message.subject?.toLowerCase() || '';
        if (!subject.includes(propsValue.subjectContains.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    return filteredMessages.map((message) => ({
      epochMilliSeconds: dayjs(message.receivedDateTime).valueOf(),
      data: message,
    }));
  },
};

export const newEmailTrigger = createTrigger({
  auth: microsoftOutlookAuth,
  name: 'newEmail',
  displayName: 'New Email',
  description: 'Triggers when a new email is received in the inbox.',
  props: {
    senderEmail: Property.ShortText({
      displayName: 'Sender Email',
      description: 'Filter emails from a specific sender email address',
      required: false,
    }),
    recipientEmail: Property.ShortText({
      displayName: 'Recipient Email',
      description: 'Filter emails sent to a specific recipient email address',
      required: false,
    }),
    ccEmail: Property.ShortText({
      displayName: 'CC Email',
      description: 'Filter emails where a specific email address is in CC',
      required: false,
    }),
    subjectIs: Property.ShortText({
      displayName: 'Subject Equals',
      description: 'Filter emails where subject exactly matches this text',
      required: false,
    }),
    subjectContains: Property.ShortText({
      displayName: 'Subject Contains',
      description: 'Filter emails where subject contains specific text',
      required: false,
    }),
  },
  sampleData: {
    id: 'sample-email-id',
    subject: 'Sample Email Subject',
    from: {
      emailAddress: {
        name: 'John Doe',
        address: 'john.doe@example.com',
      },
    },
    toRecipients: [
      {
        emailAddress: {
          name: 'Jane Smith',
          address: 'jane.smith@example.com',
        },
      },
    ],
    receivedDateTime: '2024-01-15T10:30:00Z',
    bodyPreview: 'This is a sample email preview...',
  },
  type: TriggerStrategy.POLLING,
  async onEnable(context) {
    await pollingHelper.onEnable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  async onDisable(context) {
    await pollingHelper.onDisable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  async test(context) {
    return await pollingHelper.test(polling, context);
  },
  async run(context) {
    return await pollingHelper.poll(polling, context);
  },
});
