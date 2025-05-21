import {
  ChannelOption,
  ChatOption,
  ChatTypes,
} from '../src/lib/common/chat-types';
import {
  generateMessageWithButtons,
  TeamsMessageButton,
} from '../src/lib/common/generate-message-with-buttons';
import { getMicrosoftGraphClient } from '../src/lib/common/get-microsoft-graph-client';
import { sendChatOrChannelMessage } from '../src/lib/common/send-chat-or-channel-message';

jest.mock('../src/lib/common/get-microsoft-graph-client');
jest.mock('../src/lib/common/generate-message-with-buttons');

const mockAccessToken = 'mock-access-token';

const mockChatOption: ChatOption = {
  id: 'chat-id',
  type: ChatTypes.CHAT,
};

const mockChannelOption: ChannelOption = {
  id: 'channel-id',
  teamId: 'team-id',
  type: ChatTypes.CHANNEL,
};

const mockActions: TeamsMessageButton[] = [
  {
    buttonText: 'Approve',
    buttonStyle: 'positive',
    resumeUrl: 'https://approve.com',
  },
  {
    buttonText: 'Reject',
    buttonStyle: 'destructive',
    resumeUrl: 'https://reject.com',
  },
];

const mockMessagePayload = {
  body: {
    contentType: 'html',
    content: '<attachment id="adaptiveCardAttachment"></attachment>',
  },
  attachments: [
    {
      id: 'adaptiveCardAttachment',
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: '{}',
      contentUrl: null,
    },
  ],
};

const mockGraphClient = {
  api: jest.fn(() => ({
    post: jest.fn(),
  })),
};

describe('sendChatOrChannelMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMicrosoftGraphClient as jest.Mock).mockReturnValue(mockGraphClient);
    (generateMessageWithButtons as jest.Mock).mockReturnValue(
      mockMessagePayload,
    );
  });

  test('should send a message to a chat', async () => {
    const mockPost = jest.fn().mockResolvedValueOnce({ id: 'mock-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      post: mockPost,
    });

    const result = await sendChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChatOption,
      header: 'Test Header',
      message: 'This is a test message',
      actions: mockActions,
    });

    expect(getMicrosoftGraphClient).toHaveBeenCalledWith(mockAccessToken);

    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Test Header',
      message: 'This is a test message',
      actions: mockActions,
      enableActions: true,
      additionalText: undefined,
    });

    expect(mockGraphClient.api).toHaveBeenCalledWith('/chats/chat-id/messages');

    expect(mockPost).toHaveBeenCalledWith(mockMessagePayload);

    expect(result).toEqual({ id: 'mock-message-id' });
  });

  test('should send a message to a channel', async () => {
    const mockPost = jest.fn().mockResolvedValueOnce({ id: 'mock-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      post: mockPost,
    });

    const result = await sendChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChannelOption,
      header: 'Test Header',
      message: 'This is a channel message!',
      actions: mockActions,
      additionalText: 'Extra info about the message',
    });

    expect(getMicrosoftGraphClient).toHaveBeenCalledWith(mockAccessToken);

    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Test Header',
      message: 'This is a channel message!',
      actions: mockActions,
      enableActions: true,
      additionalText: 'Extra info about the message',
    });

    expect(mockGraphClient.api).toHaveBeenCalledWith(
      '/teams/team-id/channels/channel-id/messages',
    );

    expect(mockPost).toHaveBeenCalledWith(mockMessagePayload);

    expect(result).toEqual({ id: 'mock-message-id' });
  });

  test('should handle empty actions', async () => {
    const mockPost = jest.fn().mockResolvedValueOnce({ id: 'mock-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      post: mockPost,
    });

    const result = await sendChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChatOption,
      header: 'Header with no actions',
      message: 'Message content',
      actions: [],
    });

    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Header with no actions',
      message: 'Message content',
      actions: [],
      enableActions: true,
      additionalText: undefined,
    });

    expect(mockGraphClient.api).toHaveBeenCalledWith('/chats/chat-id/messages');

    expect(mockPost).toHaveBeenCalledWith(mockMessagePayload);

    expect(result).toEqual({ id: 'mock-message-id' });
  });

  test('should handle when additionalText is undefined', async () => {
    const mockPost = jest.fn().mockResolvedValueOnce({ id: 'mock-message-id' });
    mockGraphClient.api.mockReturnValueOnce({
      post: mockPost,
    });

    const result = await sendChatOrChannelMessage({
      accessToken: mockAccessToken,
      chatOrChannel: mockChatOption,
      header: 'Header',
      actions: mockActions,
    });

    expect(generateMessageWithButtons).toHaveBeenCalledWith({
      header: 'Header',
      message: undefined,
      actions: mockActions,
      enableActions: true,
      additionalText: undefined,
    });

    expect(mockGraphClient.api).toHaveBeenCalledWith('/chats/chat-id/messages');

    expect(mockPost).toHaveBeenCalledWith(mockMessagePayload);

    expect(result).toEqual({ id: 'mock-message-id' });
  });
});
