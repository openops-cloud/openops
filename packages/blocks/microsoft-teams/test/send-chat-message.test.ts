import { sendChatMessageAction } from '../src/lib/actions/send-chat-message';

const mockPost = jest.fn();
const mockCreateOrGetUserChat = jest.fn();
const mockChatExists = jest.fn();

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  getMicrosoftGraphClient: jest.fn(() => ({
    api: jest.fn(() => ({
      post: mockPost,
    })),
  })),
}));

jest.mock('../src/lib/common/create-or-get-user-chat', () => ({
  createOrGetUserChat: jest.fn((...args: unknown[]) =>
    mockCreateOrGetUserChat(...args),
  ),
}));

jest.mock('../src/lib/common/chat-exists', () => ({
  chatExists: jest.fn((...args: unknown[]) => mockChatExists(...args)),
}));

const mockContextWithChatId = {
  ...jest.requireActual('@openops/blocks-framework'),
  auth: {
    access_token: 'fake_token',
  },
  propsValue: {
    chatId: 'chat-id-456',
    contentType: 'text',
    content: 'Hello, Teams!',
  },
};

const mockContextWithEmail = {
  ...jest.requireActual('@openops/blocks-framework'),
  auth: {
    access_token: 'fake_token',
  },
  propsValue: {
    chatId: 'user@example.com',
    contentType: 'text',
    content: 'Hello, User!',
  },
};

describe('sendChatMessageAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ id: 'message-id-789' });
    mockCreateOrGetUserChat.mockResolvedValue('user-chat-id-123');
    mockChatExists.mockResolvedValue(true);
  });

  test('should create action with correct properties', () => {
    const props = sendChatMessageAction.props;
    expect(Object.keys(props).length).toBe(3);
    expect(props).toMatchObject({
      chatId: {
        required: true,
        type: 'DROPDOWN',
      },
      contentType: {
        required: true,
        type: 'STATIC_DROPDOWN',
      },
      content: {
        required: true,
        type: 'LONG_TEXT',
      },
    });
  });

  test('should send a chat message using existing chat ID', async () => {
    mockPost.mockResolvedValue({ id: 'message-id-789' });
    mockChatExists.mockResolvedValue(true);
    const response = await sendChatMessageAction.run(mockContextWithChatId);

    expect(mockChatExists).toHaveBeenCalledWith('fake_token', 'chat-id-456');
    expect(mockPost).toHaveBeenCalledWith({
      body: {
        content: 'Hello, Teams!',
        contentType: 'text',
      },
    });
    expect(response).toEqual({ id: 'message-id-789' });
    expect(mockCreateOrGetUserChat).not.toHaveBeenCalled();
  });

  test('should create/get chat when chat does not exist', async () => {
    mockPost.mockResolvedValue({ id: 'message-id-890' });
    mockChatExists.mockResolvedValue(false);
    const response = await sendChatMessageAction.run(mockContextWithEmail);

    expect(mockChatExists).toHaveBeenCalledWith(
      'fake_token',
      'user@example.com',
    );
    expect(mockCreateOrGetUserChat).toHaveBeenCalledWith(
      'fake_token',
      'user@example.com',
    );
    expect(mockPost).toHaveBeenCalledWith({
      body: {
        content: 'Hello, User!',
        contentType: 'text',
      },
    });
    expect(response).toEqual({ id: 'message-id-890' });
  });

  test('should throw an error if unable to send a message', async () => {
    mockPost.mockRejectedValue(new Error('Failed to send message'));
    mockChatExists.mockResolvedValue(true);

    await expect(
      sendChatMessageAction.run(mockContextWithChatId),
    ).rejects.toThrow('Failed to send message');
  });
});
