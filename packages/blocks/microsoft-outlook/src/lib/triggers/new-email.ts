import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { Message, Recipient } from '@microsoft/microsoft-graph-types';
import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import { isEmpty, isString } from '@openops/shared';
import dayjs from 'dayjs';
import { microsoftOutlookAuth } from '../common/auth';
import { mailFolderIdDropdown } from '../common/props';

function normalizeString(value: string): string {
  return value.toLowerCase().trim();
}

function normalizeFilterArray(array: unknown[]): string[] {
  return array
    .filter(Boolean)
    .map((value) => {
      if (!isString(value)) {
        throw new TypeError(`Expected string, got ${typeof value}`);
      }
      return normalizeString(value);
    })
    .filter((str) => str.length > 0);
}

function extractEmailAddresses(
  recipients: Recipient[] | null | undefined,
): string[] {
  if (!recipients) return [];
  return recipients
    .map((recipient) => recipient.emailAddress?.address)
    .filter(isString)
    .map(normalizeString)
    .filter((str) => !isEmpty(str));
}

function matchesAnyFilter(targets: string[], filters: string[]): boolean {
  return filters.some((filter) =>
    targets.some((target) => target.includes(filter)),
  );
}

function applyArrayFilter(
  filterKey: string,
  propsValue: Record<string, unknown>,
  messageTargets: string[],
): boolean {
  const filtersToMatch = normalizeFilterArray(
    propsValue[filterKey] as unknown[],
  );
  if (filtersToMatch.length === 0) {
    return true;
  }

  return matchesAnyFilter(messageTargets, filtersToMatch);
}

function applyClientSideFilters(
  message: Message,
  propsValue: Record<string, unknown>,
): boolean {
  const senderTargets = [
    message.from?.emailAddress?.address,
    message.from?.emailAddress?.name,
  ]
    .filter(isString)
    .map(normalizeString)
    .filter((str) => !isEmpty(str));
  if (!applyArrayFilter('senders', propsValue, senderTargets)) {
    return false;
  }

  const messageRecipients = extractEmailAddresses(message.toRecipients);
  if (!applyArrayFilter('recipients', propsValue, messageRecipients)) {
    return false;
  }

  const messageCcRecipients = extractEmailAddresses(message.ccRecipients);
  if (!applyArrayFilter('cc', propsValue, messageCcRecipients)) {
    return false;
  }

  if (isString(propsValue['subject']) && !isEmpty(propsValue['subject'])) {
    const subjectToMatch = normalizeString(propsValue['subject']);
    const messageSubject = message.subject;

    if (!isString(messageSubject) || isEmpty(messageSubject)) {
      return false;
    }

    if (!normalizeString(messageSubject).includes(subjectToMatch)) {
      return false;
    }
  }

  return true;
}

const SELECT_FIELDS = [
  'id',
  'subject',
  'from',
  'toRecipients',
  'ccRecipients',
  'receivedDateTime',
  'bodyPreview',
].join(',');

async function createGraphClient(accessToken: string): Promise<Client> {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: () => Promise.resolve(accessToken),
    },
  });
}

async function fetchMessages(
  client: Client,
  folderId: string,
  lastFetchEpochMS: number,
): Promise<Message[]> {
  const messages: Message[] = [];
  const baseUrl = `/me/mailFolders/${folderId || 'inbox'}/messages`;

  const filter =
    lastFetchEpochMS === 0
      ? '$top=10'
      : `$filter=receivedDateTime gt ${dayjs(lastFetchEpochMS).toISOString()}`;

  let response: PageCollection = await client
    .api(`${baseUrl}?${filter}&$select=${SELECT_FIELDS}`)
    .orderby('receivedDateTime desc')
    .get();

  const shouldFetchAll = lastFetchEpochMS !== 0;

  do {
    messages.push(...(response.value as Message[]));

    if (!shouldFetchAll || !response['@odata.nextLink']) {
      break;
    }

    response = await client.api(response['@odata.nextLink']).get();
  } while (response.value.length > 0);

  return messages;
}

const polling: Polling<
  BlockPropValueSchema<typeof microsoftOutlookAuth>,
  Record<string, unknown>
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const client = await createGraphClient(auth.access_token);

    const messages = await fetchMessages(
      client,
      propsValue['mailBox'] as string,
      lastFetchEpochMS,
    );

    const filteredMessages = messages.filter((message) =>
      applyClientSideFilters(message, propsValue),
    );

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
    mailBox: mailFolderIdDropdown({
      displayName: 'Mail Folder',
      description: 'The folder to monitor for new emails.',
      required: false,
    }),
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
