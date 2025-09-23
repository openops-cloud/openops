import { sendChatMessageAction } from '../src/lib/actions/send-chat-message';

const mockPost = jest.fn();

jest.mock('@openops/common', () => ({
  getMicrosoftGraphClient: jest.fn(() => ({
    api: jest.fn(() => ({
      post: mockPost,
    })),
  })),
}));

const mockContext = {
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

describe('sendChatMessageAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ id: 'message-id-789' });
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

  test('should send a chat message successfully', async () => {
    mockPost.mockResolvedValue({ id: 'message-id-789' });
    const response = await sendChatMessageAction.run(mockContext);

    expect(mockPost).toHaveBeenCalledWith({
      body: {
        content: 'Hello, Teams!',
        contentType: 'text',
      },
    });
    expect(response).toEqual({ id: 'message-id-789' });
  });

  test('should throw an error if unable to send a message', async () => {
    mockPost.mockRejectedValue(new Error('Failed to send message'));

    await expect(sendChatMessageAction.run(mockContext)).rejects.toThrow(
      'Failed to send message',
    );
  });
});
