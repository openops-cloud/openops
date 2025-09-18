import {
  AuthenticationType,
  httpClient,
  HttpMethod,
  HttpRequest,
  HttpResponse,
} from '@openops/blocks-common';
import { Property, WorkflowFile } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import { isEmpty } from '@openops/shared';
import { MessageInfo } from './message-result';

export const slackSendMessage = async ({
  text,
  conversationId,
  username,
  blocks,
  threadTs,
  token,
  file,
  eventPayload,
}: SlackSendMessageParams): Promise<MessageInfo> => {
  let response: HttpResponse;
  let request: HttpRequest;

  if (file) {
    const formData = new FormData();
    formData.append('file', new Blob([file.data]));
    formData.append('channels', conversationId);
    formData.append('initial_comment', text);
    if (threadTs) formData.append('thread_ts', threadTs);

    request = {
      url: `https://slack.com/api/files.upload`,
      method: HttpMethod.POST,
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token,
      },
    };
    response = await httpClient.sendRequest(request);
  } else {
    const body: any = {
      text,
      channel: conversationId,
      metadata: {
        event_type: 'slack-message',
        event_payload: eventPayload,
      },
    };

    if (username) body['username'] = username;
    if (blocks) body['blocks'] = blocks;
    if (threadTs) body['thread_ts'] = threadTs;

    request = {
      method: HttpMethod.POST,
      url: 'https://slack.com/api/chat.postMessage',
      body,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token,
      },
    };

    response = await httpClient.sendRequest(request);
  }

  if (!response.body.ok) {
    switch (response.body.error) {
      case 'not_in_channel':
        throw new Error(
          JSON.stringify({
            message: 'The bot is not in the channel',
            code: 'not_in_channel',
            action: 'Invite the bot from the channel settings',
          }),
        );
      default: {
        throw new Error(JSON.stringify(response.body));
      }
    }
  }

  return {
    success: true,
    request_body: request.body,
    response_body: response.body,
  };
};

export async function slackUpdateMessage({
  token,
  conversationId,
  blocks,
  messageTimestamp,
  metadata,
  text,
}: SlackUpdateMessageParams): Promise<MessageInfo> {
  const body = {
    channel: conversationId,
    blocks: blocks,
    ts: messageTimestamp,
    metadata: metadata,
    text: text,
  };

  const request: HttpRequest = {
    method: HttpMethod.POST,
    url: 'https://slack.com/api/chat.update',
    body,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token,
    },
  };

  const response = await httpClient.sendRequest(request);

  return {
    success: true,
    request_body: request.body,
    response_body: response.body,
  };
}

type SlackSendMessageParams = {
  token: string;
  conversationId: string;
  username?: string;
  blocks?: unknown[] | Record<string, any>;
  text: string;
  file?: WorkflowFile;
  threadTs?: string;
  eventPayload?: Record<string, any>;
  sentMessageKitBlock?: boolean;
};

type SlackUpdateMessageParams = {
  token: string;
  conversationId: string;
  blocks: unknown[];
  text: string;
  messageTimestamp: string;
  metadata?: Record<string, any>;
};

export async function getUserIdFromEmail(token: string, email: string) {
  const request: HttpRequest = {
    method: HttpMethod.GET,
    url: `https://slack.com/api/users.lookupByEmail?email=${email}`,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token,
    },
  };

  const response: HttpResponse = await httpClient.sendRequest(request);

  if (!response.body['ok']) {
    throw new Error(
      `Error getting user id from email failed with error: ${response.body['error']} for email: ${email}`,
    );
  }

  return response.body['user']['id'];
}

export async function getUserInfo(token: string, userId: string) {
  const request: HttpRequest = {
    method: HttpMethod.GET,
    url: `https://slack.com/api/users.info?user=${userId}`,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token,
    },
  };

  const response: HttpResponse = await httpClient.sendRequest(request);

  if (!response.body['ok']) {
    throw new Error(`Error getting info from user: ${response.body['error']}`);
  }

  return response.body['user'];
}

export async function listChannels(
  token: string,
): Promise<{ id: string; name: string }[]> {
  const maxApiLimit = 1000;

  logger.debug('Listing slack channels...');

  const request: HttpRequest = {
    method: HttpMethod.GET,
    url: `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=${maxApiLimit}&exclude_archived=true`,
    authentication: {
      type: AuthenticationType.BEARER_TOKEN,
      token: token,
    },
  };
  const response = await httpClient.sendRequest<{
    channels: { id: string; name: string }[];
  }>(request);

  logger.info(`Found ${response.body.channels.length} channels`, {
    numberOfChannels: response.body.channels.length,
  });

  return response.body.channels;
}

export function dynamicBlockKitProperties(): any {
  return {
    headerText: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['blockKitEnabled'],
      props: async ({ blockKitEnabled }) => {
        if (!blockKitEnabled) {
          return {
            headerText: Property.LongText({
              displayName: 'Message header',
              description: 'The header of your message',
              required: false,
            }),
          };
        }
        const result: any = {};
        return result;
      },
    }),
    text: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['blockKitEnabled'],
      props: async ({ blockKitEnabled }) => {
        if (!blockKitEnabled) {
          return {
            text: Property.LongText({
              displayName: 'Message',
              description: 'The text of your message',
              required: true,
            }),
          };
        }
        const result: any = {};
        return result;
      },
    }),
    blocks: Property.DynamicProperties({
      displayName: '',
      required: false,
      refreshers: ['blockKitEnabled'],
      props: async ({ blockKitEnabled }) => {
        if (!blockKitEnabled) {
          return {};
        }
        const result: any = {
          blocks: Property.Json({
            displayName: 'Block Kit blocks',
            description: 'See https://api.slack.com/block-kit for specs',
            required: true,
            defaultValue: [
              {
                type: 'section',
                text: { type: 'mrkdwn', text: '*This is a header*' },
              },
              { type: 'divider' },
              {
                type: 'section',
                text: { type: 'mrkdwn', text: 'This is a message' },
              },
            ],
          }),
        };
        return result;
      },
    }),
  };
}

interface SlackElement {
  type: string;
  text: SlackText;
  style?: string;
  confirm?: ConfirmationPrompt;
}

interface SlackText {
  type: string;
  text: string;
}

interface ConfirmationPrompt {
  title: SlackText;
  text: SlackText;
  deny: SlackText;
  confirm: SlackText;
}

function createConfirmationPrompt(
  confirmationPromptText: string,
): ConfirmationPrompt {
  const defaultText = 'Are you sure?';
  const text = isEmpty(confirmationPromptText?.trim())
    ? defaultText
    : confirmationPromptText;

  return {
    deny: {
      text: 'Cancel',
      type: 'plain_text',
    },
    text: {
      text: text,
      type: 'plain_text',
    },
    title: {
      text: defaultText,
      type: 'plain_text',
    },
    confirm: {
      text: 'Confirm',
      type: 'plain_text',
    },
  };
}

function createButton(action: {
  buttonText: string;
  buttonStyle: string;
  confirmationPrompt: boolean;
  confirmationPromptText: string;
}): SlackElement {
  const {
    buttonText,
    buttonStyle,
    confirmationPrompt,
    confirmationPromptText,
  } = action;

  const button: SlackElement = {
    type: 'button',
    text: {
      type: 'plain_text',
      text: buttonText,
    },
  };

  if (buttonStyle === 'danger' || buttonStyle === 'primary') {
    button.style = buttonStyle;
  }

  if (confirmationPrompt) {
    button.confirm = createConfirmationPrompt(confirmationPromptText);
  }

  return button;
}

export function createMessageBlocks(
  headerText: string,
  messageText: string,
): any[] {
  const headerBlocks = [];

  if (
    headerText !== undefined &&
    headerText !== null &&
    headerText.trim().length !== 0
  ) {
    headerBlocks.push(
      ...[
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${headerText}*`,
          },
        },
        {
          type: 'divider',
        },
      ],
    );
  }

  return [
    ...headerBlocks,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${messageText}`,
        unfurl_links: false,
        unfurl_media: false,
      },
    },
  ];
}

export function createMessageBlocksWithActions(
  headerText: string,
  messageText: string,
  actions: { buttonText: string; buttonStyle: string }[],
): any[] {
  const actionElements: SlackElement[] = actions.map((action: any) =>
    createButton(action),
  );
  const headerBlocks = [];

  if (headerText !== null && headerText.trim().length !== 0) {
    headerBlocks.push(
      ...[
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${headerText}*`,
          },
        },
        {
          type: 'divider',
        },
      ],
    );
  }

  return [
    ...headerBlocks,
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${messageText}`,
      },
    },
    {
      type: 'actions',
      block_id: 'actions',
      elements: actionElements,
    },
  ];
}
