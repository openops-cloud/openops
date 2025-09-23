import { PageCollection } from '@microsoft/microsoft-graph-client';
import { Message } from '@microsoft/microsoft-graph-types';
import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import dayjs from 'dayjs';
import { microsoftOutlookAuth } from '../common/auth';
import { mailFolderIdDropdown } from '../common/props';

const polling: Polling<
  BlockPropValueSchema<typeof microsoftOutlookAuth>,
  { receiver?: string; folderId?: string }
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const client = getMicrosoftGraphClient(auth.access_token);

    const messages: Message[] = [];
    const receiver = propsValue?.receiver?.trim();
    const folderId = propsValue?.folderId?.trim();

    const filter =
      lastFetchEpochMS === 0
        ? '$top=10'
        : `$filter=receivedDateTime gt ${dayjs(
            lastFetchEpochMS,
          ).toISOString()}`;

    const request = client.api(
      `/me/mailFolders/${folderId || 'inbox'}/messages?${filter}`,
    );

    if (receiver) {
      request.header('ConsistencyLevel', 'eventual').query({
        $search: `"to:${receiver}"&$select=subject,toRecipients,receivedDateTime`,
      });
    } else {
      request.orderby('receivedDateTime desc');
    }

    let response: PageCollection = await request.get();
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
    folderId: mailFolderIdDropdown({
      displayName: 'Folder',
      description: 'Read emails from a specific folder. Leave empty for Inbox.',
      required: false,
    }),
    receiver: Property.ShortText({
      displayName: 'Receiver',
      description:
        'Filter emails where the receiver (To) matches this email address. Uses $search with "to:<address>".',
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
