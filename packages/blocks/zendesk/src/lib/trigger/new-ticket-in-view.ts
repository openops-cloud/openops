import {
  AuthenticationType,
  DedupeStrategy,
  httpClient,
  HttpMethod,
  Polling,
  pollingHelper,
} from '@openops/blocks-common';
import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@openops/blocks-framework';
import { zendeskAuth } from '../..';

interface ZendeskView {
  id: number;
  title: string;
  active: boolean;
  position: number;
  description?: string | null;
  conditions?: object;
  created_at?: string;
  default?: boolean;
  execution?: object;
  restriction?: object | null;
  updated_at?: string;
}

interface ZendeskTicket {
  id: number;
  subject: string;
  status: string;
  description?: string;
  priority?: string;
  type?: string;
  requester_id?: number;
  submitter_id?: number;
  assignee_id?: number;
  organization_id?: number;
  group_id?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  raw_subject?: string;
  satisfaction_rating?: object | null;
  custom_fields?: any[];
  custom_status_id?: number;
  ticket_form_id?: number;
  brand_id?: number;
  allow_channelback?: boolean;
  allow_attachments?: boolean;
  from_messaging_channel?: boolean;
}

export const newTicketInView = createTrigger({
  auth: zendeskAuth,
  name: 'new_ticket_in_view',
  displayName: 'New Ticket In View',
  description: 'Triggers when a new ticket is created in a view',
  type: TriggerStrategy.POLLING,
  props: {
    view_id: Property.Dropdown({
      displayName: 'View',
      description: 'The view to monitor for new tickets',
      refreshers: ['auth'],
      required: true,
      options: async ({ auth }) => {
        const authentication = auth as AuthProps;
        if (
          !authentication?.['email'] ||
          !authentication?.['subdomain'] ||
          !authentication?.['token']
        ) {
          return {
            placeholder: 'Create a connection first',
            disabled: true,
            options: [],
          };
        }
        const response = await httpClient.sendRequest<{ views: ZendeskView[] }>(
          {
            url: `https://${authentication.subdomain}.zendesk.com/api/v2/views.json`,
            method: HttpMethod.GET,
            authentication: {
              type: AuthenticationType.BASIC,
              username: authentication.email + '/token',
              password: authentication.token,
            },
          },
        );
        return {
          placeholder: 'Select a view',
          options: response.body.views.map((view: ZendeskView) => ({
            label: view.title,
            value: view.id,
          })),
        };
      },
    }),
  },
  sampleData: {
    url: 'https://openops.zendesk.com/api/v2/tickets/5.json',
    id: 5,
    external_id: null,
    via: {
      channel: 'web',
      source: {
        from: {},
        to: {},
        rel: null,
      },
    },
    created_at: '2023-03-25T02:39:41Z',
    updated_at: '2023-03-25T02:39:41Z',
    type: null,
    subject: 'Subject',
    raw_subject: 'Raw Subject',
    description: 'Description',
    priority: null,
    status: 'open',
    recipient: null,
    requester_id: 8193592318236,
    submitter_id: 8193592318236,
    assignee_id: 8193592318236,
    organization_id: 8193599387420,
    group_id: 8193569448092,
    collaborator_ids: [],
    follower_ids: [],
    email_cc_ids: [],
    forum_topic_id: null,
    problem_id: null,
    has_incidents: false,
    is_public: true,
    due_at: null,
    tags: [],
    custom_fields: [],
    satisfaction_rating: null,
    sharing_agreement_ids: [],
    custom_status_id: 8193592472348,
    fields: [],
    followup_ids: [],
    ticket_form_id: 8193569410076,
    brand_id: 8193583542300,
    allow_channelback: false,
    allow_attachments: true,
    from_messaging_channel: false,
  },
  onEnable: async (context) => {
    await pollingHelper.onEnable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  onDisable: async (context) => {
    await pollingHelper.onDisable(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  run: async (context) => {
    return await pollingHelper.poll(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
  test: async (context) => {
    return await pollingHelper.test(polling, {
      auth: context.auth,
      store: context.store,
      propsValue: context.propsValue,
    });
  },
});

type AuthProps = {
  email: string;
  token: string;
  subdomain: string;
};

const polling: Polling<AuthProps, { view_id: number }> = {
  strategy: DedupeStrategy.LAST_ITEM,
  items: async ({ auth, propsValue }) => {
    const items = await getTickets(auth, propsValue.view_id);
    return items.map((item) => ({
      id: item.id,
      data: item,
    }));
  },
};

async function getTickets(authentication: AuthProps, view_id: number) {
  const { email, token, subdomain } = authentication;
  const response = await httpClient.sendRequest<{ tickets: ZendeskTicket[] }>({
    url: `https://${subdomain}.zendesk.com/api/v2/views/${view_id}/tickets.json?sort_order=desc&sort_by=created_at&per_page=200`,
    method: HttpMethod.GET,
    authentication: {
      type: AuthenticationType.BASIC,
      username: email + '/token',
      password: token,
    },
  });
  return response.body.tickets;
}
