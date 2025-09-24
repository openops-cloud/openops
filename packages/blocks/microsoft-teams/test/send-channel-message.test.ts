import { sendChannelMessageAction } from '../src/lib/actions/send-channel-message';

const mockPost = jest.fn();

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
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
    teamId: 'team-id-123',
    channelId: 'channel-id-456',
    contentType: 'text',
    content: 'Hello, Teams!',
  },
};

describe('sendChannelMessageAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    const props = sendChannelMessageAction.props;
    expect(Object.keys(props).length).toBe(4);
    expect(props).toMatchObject({
      teamId: {
        required: true,
        type: 'DROPDOWN',
      },
      channelId: {
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

  test('should send a channel message successfully', async () => {
    mockPost.mockResolvedValue({ id: 'message-id-789' });
    const response = await sendChannelMessageAction.run(mockContext);

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

    await expect(sendChannelMessageAction.run(mockContext)).rejects.toThrow(
      'Failed to send message',
    );
  });
});
