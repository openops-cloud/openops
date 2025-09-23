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

    const contentFilters: string[] = [];

    if (propsValue?.senderEmail) {
      contentFilters.push(
        `from/emailAddress/address eq '${propsValue.senderEmail}'`,
      );
    }

    if (propsValue?.recipientEmail) {
      contentFilters.push(
        `toRecipients/any(r:r/emailAddress/address eq '${propsValue.recipientEmail}')`,
      );
    }

    if (propsValue?.ccEmail) {
      contentFilters.push(
        `ccRecipients/any(c:c/emailAddress/address eq '${propsValue.ccEmail}')`,
      );
    }

    if (propsValue?.subjectIs) {
      contentFilters.push(
        `subject eq '${propsValue.subjectIs.replace(/'/g, "''")}'`,
      );
    }

    if (propsValue?.subjectContains) {
      contentFilters.push(
        `contains(subject,'${propsValue.subjectContains.replace(/'/g, "''")}')`,
      );
    }

    const allFilters = [timeFilter, ...contentFilters].filter(Boolean);
    const filterParam =
      allFilters.length > 0 ? `$filter=${allFilters.join(' and ')}` : '';
    const topParam = lastFetchEpochMS === 0 ? '$top=10' : '';

    const queryParams = [filterParam, topParam].filter(Boolean).join('&');
    const url = `/me/mailFolders/inbox/messages${
      queryParams ? `?${queryParams}` : ''
    }`;

    let response: PageCollection = await client
      .api(url)
      .orderby('receivedDateTime desc')
      .get();

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

    return messages.map((message) => ({
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
  sampleData: {},
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
