const slackSendMessageMock = jest.fn();
jest.mock('../src/lib/common/utils', () => ({
  ...jest.requireActual('../src/lib/common/utils'),
  slackSendMessage: slackSendMessageMock,
}));

import { slackSendMessageAction } from '../src/lib/actions/send-message-action';
import { blocks } from '../src/lib/common/props';

const mockContext = {
  ...jest.requireActual('@openops/blocks-framework'),
  auth: {
    access_token: 'fake_token',
  },
  propsValue: {
    conversationId: 'C123456',
    username: 'TestUser',
    file: null,
    threadTs: null,
    headerText: {
      headerText: '',
    },
    text: {
      text: 'Hello, world!',
    },
    blocks: {
      blocks: blocks,
    },
    blockKitEnabled: false,
  },
  server: {
    publicUrl: 'http://example.com',
  },
  run: {
    pauseId: 'pause_123',
  },
  store: {
    put: jest.fn(),
  },
  generateResumeUrl: jest.fn().mockReturnValue('http://example.com/resume'),
};

describe('send message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should send a message successfully', async () => {
    slackSendMessageMock.mockResolvedValue({ response_body: { ok: true } });
    const response = await slackSendMessageAction.run(mockContext);

    expect(slackSendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fake_token',
        text: 'Hello, world!',
        username: 'TestUser',
        conversationId: 'C123456',
      }),
    );

    expect(response).toEqual({ response_body: { ok: true } });
  });

  test('should throw an error if unable to send a message', async () => {
    slackSendMessageMock.mockResolvedValue({
      response_body: { ok: false, error: 'channel_not_found' },
    });

    await expect(slackSendMessageAction.run(mockContext)).rejects.toThrow(
      'Error sending message to slack: channel_not_found',
    );

    expect(mockContext.store.put).not.toHaveBeenCalled();
  });

  test('should send a message successfully when headerText is not available', async () => {
    slackSendMessageMock.mockResolvedValue({ response_body: { ok: true } });

    const contextWithoutHeader = {
      ...mockContext,
      propsValue: {
        ...mockContext.propsValue,
        headerText: undefined,
      },
    };

    const response = await slackSendMessageAction.run(contextWithoutHeader);

    expect(slackSendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fake_token',
        text: 'Hello, world!',
        username: 'TestUser',
        conversationId: 'C123456',
      }),
    );

    expect(response).toEqual({ response_body: { ok: true } });
  });

  test('should create action with correct properties', () => {
    const props = slackSendMessageAction.props;
    expect(Object.keys(props).length).toBe(9);
    expect(props).toMatchObject({
      blockKitEnabled: {
        required: false,
        type: 'CHECKBOX',
      },
      blocks: {
        required: true,
        type: 'DYNAMIC',
      },
      conversationId: {
        required: true,
        type: 'DROPDOWN',
      },
      file: {
        required: false,
        type: 'FILE',
      },
      headerText: {
        required: true,
        type: 'DYNAMIC',
      },
      text: {
        required: true,
        type: 'DYNAMIC',
      },
      threadTs: {
        required: false,
        type: 'SHORT_TEXT',
      },
      username: {
        required: false,
        type: 'SHORT_TEXT',
      },
      unfurlLinksAndMedia: {
        required: false,
        type: 'CHECKBOX',
      },
    });
  });
});
