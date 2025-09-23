import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
import { Message } from '@microsoft/microsoft-graph-types';
import { DedupeStrategy, Polling, pollingHelper } from '@openops/blocks-common';
import {
  BlockPropValueSchema,
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import dayjs from 'dayjs';
import { microsoftOutlookAuth } from '../common/auth';
import { mailFolderIdDropdown } from '../common/props';

type NewEmailTriggerProps = {
  folderId?: string;
  senders?: unknown[];
  recipients?: unknown[];
  cc?: unknown[];
  subject?: string;
};

const extractEmail = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const v = value.trim();
    return v.length > 0 ? v : undefined;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidates = [
      obj['email'],
      obj['value'],
      obj['address'],
      (obj['emailAddress'] as { address?: string } | undefined)?.address,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) {
        return c.trim();
      }
    }
  }
  return undefined;
};

const sanitizeList = (arr?: unknown[]): string[] =>
  Array.isArray(arr)
    ? Array.from(
        new Set(
          arr
            .map((v) => extractEmail(v))
            .filter((v): v is string => typeof v === 'string' && v.length > 0),
        ),
      )
    : [];

const maybeQuoteValue = (v: string): string => (/\s/.test(v) ? `"${v}"` : v);

const groupOr = (
  field: 'from' | 'to' | 'cc' | 'subject',
  values: string[],
): string | undefined => {
  if (!values.length) return undefined;
  const terms =
    field === 'subject'
      ? values.map((v) => `subject:${maybeQuoteValue(v)}`)
      : values.map((v) => `${field}:${v}`);
  return terms.length === 1 ? terms[0] : `(${terms.join(' OR ')})`;
};

const buildSearchParam = (
  froms: string[],
  tos: string[],
  ccs: string[],
  subjectText?: string,
): string | undefined => {
  const parts: string[] = [];

  const gFrom = groupOr('from', froms);
  if (gFrom) parts.push(gFrom);

  const gTo = groupOr('to', tos);
  if (gTo) parts.push(gTo);

  const gCc = groupOr('cc', ccs);
  if (gCc) parts.push(gCc);

  if (subjectText && subjectText.trim().length > 0) {
    const groupedSubject = groupOr('subject', [subjectText.trim()]);
    if (groupedSubject) {
      parts.push(groupedSubject);
    }
  }

  if (!parts.length) return undefined;

  const expr =
    parts.length === 1
      ? parts[0]
      : parts.map((p) => (p.startsWith('(') ? p : `(${p})`)).join(' AND ');

  return `"${expr}"`;
};

const polling: Polling<
  BlockPropValueSchema<typeof microsoftOutlookAuth>,
  NewEmailTriggerProps
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, lastFetchEpochMS, propsValue }) => {
    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: () => Promise.resolve(auth.access_token),
      },
    });

    const { folderId, senders, recipients, cc, subject } = propsValue ?? {};

    const baseUrl = folderId
      ? `/me/mailFolders/${folderId}/messages`
      : '/me/mailFolders/inbox/messages';

    const fromEmails = sanitizeList(senders);
    const toEmails = sanitizeList(recipients);
    const ccEmails = sanitizeList(cc);

    const searchParam = buildSearchParam(
      fromEmails,
      toEmails,
      ccEmails,
      subject,
    );

    let request = client
      .api(baseUrl)
      .select(
        'id,subject,receivedDateTime,from,toRecipients,ccRecipients,conversationId,webLink',
      )
      .top(25);

    if (searchParam) {
      request = request
        .header('ConsistencyLevel', 'eventual')
        .search(searchParam);
    } else {
      request = request.orderby('receivedDateTime desc');
      if (lastFetchEpochMS) {
        const since = dayjs(lastFetchEpochMS)
          .subtract(5, 'minute')
          .toISOString();
        request = request.filter(`receivedDateTime ge ${since}`);
      }
    }

    const response: PageCollection = await request.get();
    const messages: Message[] = Array.isArray(response.value)
      ? (response.value as Message[])
      : [];

    let filtered = messages;
    if (searchParam && lastFetchEpochMS) {
      const cutoff = dayjs(lastFetchEpochMS).subtract(5, 'minute').valueOf();
      filtered = messages.filter(
        (m) => dayjs(m.receivedDateTime).valueOf() >= cutoff,
      );
    }

    if (searchParam) {
      filtered = filtered.sort(
        (a, b) =>
          dayjs(b.receivedDateTime).valueOf() -
          dayjs(a.receivedDateTime).valueOf(),
      );
    }

    return filtered.map((message) => ({
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
      description: 'Watch for new emails in a specific folder.',
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
