import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { Message, Recipient } from '@microsoft/microsoft-graph-types';
import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  Property,
  TriggerStrategy,
  createTrigger,
} from '@openops/blocks-framework';
import dayjs from 'dayjs';
import { microsoftOutlookAuth } from '../common/auth';
import { mailFolderIdDropdown } from '../common/props';

function normalizeString(value: unknown): string {
  return String(value).toLowerCase().trim();
}

function isValidFilterArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function normalizeFilterArray(array: unknown[]): string[] {
  return array
    .filter(Boolean)
    .map(normalizeString)
    .filter((str) => str.length > 0);
}

function extractEmailAddresses(
  recipients: Recipient[] | null | undefined,
): string[] {
  if (!recipients) return [];
  return recipients.map((recipient) =>
    normalizeString(recipient.emailAddress?.address || ''),
  );
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
  if (!isValidFilterArray(propsValue[filterKey])) {
    return true;
  }

  const filtersToMatch = normalizeFilterArray(propsValue[filterKey]);
  if (filtersToMatch.length === 0) {
    return true;
  }

  return matchesAnyFilter(messageTargets, filtersToMatch);
}

function applyClientSideFilters(
  message: Message,
  propsValue: Record<string, unknown>,
): boolean {
  const messageSender = normalizeString(
    message.from?.emailAddress?.address || '',
  );
  const messageSenderName = normalizeString(
    message.from?.emailAddress?.name || '',
  );
  if (
    !applyArrayFilter('senders', propsValue, [messageSender, messageSenderName])
  ) {
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

  if (
    propsValue['subject'] &&
    typeof propsValue['subject'] === 'string' &&
    propsValue['subject'].trim()
  ) {
    const subjectToMatch = normalizeString(propsValue['subject']);
    const messageSubject = normalizeString(message.subject || '');

    if (!messageSubject.includes(subjectToMatch)) {
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
