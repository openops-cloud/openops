import { createTrigger, TriggerStrategy } from '@openops/blocks-framework';
import { fetchEmails } from '../common/fetch-emails';
import { imapAuth } from '../common/imap-auth';
import { mailbox } from '../common/mailbox';

export const newEmail = createTrigger({
  auth: imapAuth,
  name: 'new_email',
  displayName: 'New Email',
  description: 'Trigger when a new email is received.',
  props: {
    mailbox,
  },
  type: TriggerStrategy.POLLING,
  onEnable: async (context) => {
    await context.store.put('lastPoll', Date.now());
  },
  onDisable: async (context) => {
    await context.store.delete('lastPoll');
    return;
  },
  run: async (context) => {
    const { auth, store, propsValue } = context;
    const mailbox = propsValue.mailbox;
    const lastEpochMilliSeconds = (await store.get<number>('lastPoll')) ?? 0;
    const items = await fetchEmails({
      auth,
      lastEpochMilliSeconds,
      mailbox,
    });
    const newLastEpochMilliSeconds = items.reduce(
      (acc, item) => Math.max(acc, item.epochMilliSeconds),
      lastEpochMilliSeconds,
    );
    await store.put('lastPoll', newLastEpochMilliSeconds);
    const filteredEmail = items.filter(
      (f) => f.epochMilliSeconds > lastEpochMilliSeconds,
    );
    return filteredEmail;
  },
  test: async (context) => {
    const { auth, propsValue } = context;
    const mailbox = propsValue.mailbox;
    const lastEpochMilliSeconds = 0;
    const items = await fetchEmails({
      auth,
      lastEpochMilliSeconds,
      mailbox,
    });
    const filteredEmails = getFirstFiveOrAll(items);
    return filteredEmails;
  },
  sampleData: {
    html: 'My email body',
    text: 'My email body',
    textAsHtml: '<p>My email body</p>',
    subject: 'Email Subject',
    date: '2023-06-18T11:30:09.000Z',
    to: {
      value: [
        {
          address: 'email@address.com',
          name: 'Name',
        },
      ],
    },
    from: {
      value: [
        {
          address: 'email@address.com',
          name: 'Name',
        },
      ],
    },
    cc: {
      value: [
        {
          address: 'email@address.com',
          name: 'Name',
        },
      ],
    },
    messageId:
      '<CxE49ifJT5YZN9OE2O6j6Ef+BYgkKWq7X-deg483GkM1ui1xj3g@mail.gmail.com>',
  },
});

function getFirstFiveOrAll<T>(array: T[]) {
  if (array.length <= 5) {
    return array;
  } else {
    return array.slice(0, 5);
  }
}
