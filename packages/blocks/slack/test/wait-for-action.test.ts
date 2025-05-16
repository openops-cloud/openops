const pauseMock = jest.fn();
const slackUpdateMessageMock = jest.fn();
jest.mock('../src/lib/common/utils', () => {
  return {
    slackUpdateMessage: slackUpdateMessageMock,
  };
});

import { StoreScope } from '@openops/blocks-framework';
import { ExecutionType } from '@openops/shared';
import { waitForAction } from '../src/lib/actions/wait-for-action';
import { MessageInfo } from '../src/lib/common/message-result';

describe('waitForAction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(waitForAction.props).toMatchObject({
      message: {
        type: 'LONG_TEXT',
        displayName: 'Message',
        required: true,
      },
      actions: {
        type: 'MULTI_SELECT_DROPDOWN',
        displayName: 'User Actions',
        required: true,
        refreshers: ['message'],
      },
      timeoutInDays: {
        type: 'NUMBER',
        required: true,
      },
    });
  });

  test.each([
    [undefined],
    [null],
    {},
    [{}],
    { noSuccess: 1, request_body: 2, response_body: 3 },
    { success: false, noRequestBody: 2, response_body: 3 },
    { success: true, request_body: 2, noResponseBody: 3 },
  ])('should throw when invalid message is provided', async (message: any) => {
    const context = createContext({ message: message });

    await expect(waitForAction.run(context)).rejects.toThrow(
      'The provided argument is not a valid Slack message, please use an output from a previous Slack step.',
    );
  });

  test('should pause the flow when context is ExecutionType=BEGIN and store the pauseMetadata', async () => {
    const context = createContext();

    const result = (await waitForAction.run(context)) as any;

    expect(result).toStrictEqual({
      action: '',
      user: '',
      isExpired: undefined,
      message: context.propsValue.message,
    });

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(context.store.put).toHaveBeenCalledTimes(1);
    expect(context.store.put).toHaveBeenCalledWith(
      'pauseMetadata_step_1',
      expect.any(Object),
      StoreScope.FLOW_RUN,
    );
  });

  test('should expire message when timeout resume is triggered', async () => {
    slackUpdateMessageMock.mockResolvedValue('some updated message');

    const context = createContext({
      executionType: ExecutionType.RESUME,
      resumePayload: {},
    });

    const result = (await waitForAction.run(context)) as any;

    expect(result).toStrictEqual({
      user: '',
      action: '',
      isExpired: true,
      message: 'some updated message',
    });

    expect(slackUpdateMessageMock).toHaveBeenCalledTimes(1);
    expect(slackUpdateMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: expect.arrayContaining([expect.anything()]),
      }),
    );

    const lastCallArgs =
      slackUpdateMessageMock.mock.calls[
        slackUpdateMessageMock.mock.calls.length - 1
      ][0];
    const blocksArray = lastCallArgs.blocks;
    const lastBlock = blocksArray[blocksArray.length - 1];

    expect(lastBlock.text.text).toBe(
      '*:exclamation: The time to act on this message has expired.*',
    );
  });

  test('should update message when resume is triggered with a selected user action and username exists', async () => {
    slackUpdateMessageMock.mockResolvedValue('some updated message');

    const context = createContext({
      executionType: ExecutionType.RESUME,
      currentExecutionPath: 'some step',
      actions: ['some action'],
      resumePayload: {
        queryParams: {
          userName: 'some_user',
          actionClicked: 'some action',
          path: 'step_1',
        },
      },
    });

    const result = (await waitForAction.run(context)) as any;

    expect(result).toStrictEqual({
      action: 'some action',
      user: 'some_user',
      isExpired: false,
      message: 'some updated message',
    });

    expect(slackUpdateMessageMock).toHaveBeenCalledTimes(1);
    expect(slackUpdateMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: expect.arrayContaining([expect.anything()]),
      }),
    );

    const lastCallArgs =
      slackUpdateMessageMock.mock.calls[
        slackUpdateMessageMock.mock.calls.length - 1
      ][0];
    const blocksArray = lastCallArgs.blocks;
    const lastBlock = blocksArray[blocksArray.length - 1];

    expect(lastBlock.text.text).toBe(
      `*:white_check_mark: Action received: user @some_user clicked on 'some action'*`,
    );
    expect(context.store.get).not.toHaveBeenCalled();
    expect(context.store.put).not.toHaveBeenCalled();
  });

  test.each([null, undefined, ''])(
    'should update message when resume is triggered with a selected user action and no username',
    async (username) => {
      slackUpdateMessageMock.mockResolvedValue('some updated message');

      const context = createContext({
        executionType: ExecutionType.RESUME,
        currentExecutionPath: 'some step',
        actions: ['some action'],
        resumePayload: {
          queryParams: {
            userName: username,
            actionClicked: 'some action',
            path: 'step_1',
          },
        },
      });

      const result = (await waitForAction.run(context)) as any;

      expect(result).toStrictEqual({
        action: 'some action',
        user: username,
        isExpired: false,
        message: 'some updated message',
      });

      expect(slackUpdateMessageMock).toHaveBeenCalledTimes(1);
      expect(slackUpdateMessageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          blocks: expect.arrayContaining([expect.anything()]),
        }),
      );

      const lastCallArgs =
        slackUpdateMessageMock.mock.calls[
          slackUpdateMessageMock.mock.calls.length - 1
        ][0];
      const blocksArray = lastCallArgs.blocks;
      const lastBlock = blocksArray[blocksArray.length - 1];

      expect(lastBlock.text.text).toBe(
        `*:white_check_mark: Action received: clicked on 'some action'*`,
      );
      expect(context.store.get).not.toHaveBeenCalled();
      expect(context.store.put).not.toHaveBeenCalled();
    },
  );

  test('should pause flow again if resume is triggered for another step', async () => {
    const context = createContext({
      executionType: ExecutionType.RESUME,
      currentExecutionPath: 'some step',
      actions: ['some action'],
      resumePayload: {
        queryParams: {
          userName: 'some_user',
          actionClicked: 'some action',
          path: 'some other step',
        },
      },
    });

    const result = (await waitForAction.run(context)) as any;

    expect(result).toStrictEqual({
      user: '',
      action: '',
      isExpired: undefined,
      message: context.propsValue.message,
    });
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(context.store.get).toHaveBeenCalledTimes(1);
    expect(context.store.get).toHaveBeenCalledWith(
      'pauseMetadata_step_1',
      StoreScope.FLOW_RUN,
    );
    expect(context.store.put).not.toHaveBeenCalled();
  });

  test('should pause flow again if resume is triggered with a user action that was not selected', async () => {
    const context = createContext({
      executionType: ExecutionType.RESUME,
      currentExecutionPath: 'some step',
      actions: ['some action'],
      resumePayload: {
        queryParams: {
          userName: 'some_user',
          actionClicked: 'invalid action',
          path: 'some step',
        },
      },
    });

    const result = (await waitForAction.run(context)) as any;

    expect(result).toStrictEqual({
      user: '',
      action: '',
      isExpired: undefined,
      message: context.propsValue.message,
    });
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(context.store.get).toHaveBeenCalledTimes(1);
    expect(context.store.get).toHaveBeenCalledWith(
      'pauseMetadata_step_1',
      StoreScope.FLOW_RUN,
    );
    expect(context.store.put).not.toHaveBeenCalled();
  });

  test('should throw exception if resume is triggered for another step and pauseMetadata is not stored in context', async () => {
    const context = createContext({
      executionType: ExecutionType.RESUME,
      currentExecutionPath: 'some step',
      actions: ['some action'],
      run: {
        pause: pauseMock,
      },
      resumePayload: {
        queryParams: {
          path: 'step_2',
          userName: 'some_user',
          actionClicked: 'some action',
        },
      },
    });

    context.store.get = jest.fn().mockResolvedValue(null);

    await expect(waitForAction.run(context)).rejects.toThrow(
      'Could not fetch pause metadata: step_1',
    );

    expect(context.store.get).toHaveBeenCalledTimes(1);
    expect(context.store.get).toHaveBeenCalledWith(
      'pauseMetadata_step_1',
      StoreScope.FLOW_RUN,
    );
    expect(context.store.put).not.toHaveBeenCalled();
  });
});

interface ContextParams {
  run?: { pause?: jest.Mock };
  resumePayload?: any;
  message?: MessageInfo;
  actions?: string[];
  timeoutInDays?: number;
  executionType?: ExecutionType;
  currentExecutionPath?: string;
}

function createContext(params?: ContextParams) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    propsValue: {
      message: params?.message ?? defaultMessage,
      actions: params?.actions ?? ['Click Me'],
      timeoutInDays: params?.timeoutInDays ?? 1,
    },
    executionType: params?.executionType ?? ExecutionType.BEGIN,
    currentExecutionPath: params?.currentExecutionPath ?? 'some step',
    resumePayload: params?.resumePayload,
    run: params?.run ?? { pause: pauseMock },
    store: {
      put: jest.fn(),
      get: jest.fn().mockResolvedValue(defaultMessage),
    },
    auth: {
      access_token: 'some token',
    },
  };
}

const defaultMessage: MessageInfo = {
  success: true,
  response_body: {
    message: {
      metadata: {
        event_payload: {
          resumeUrl: 'https://test.com/?path=step_1',
        },
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: 'This is a plain text section block.',
            emoji: true,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Click Me', emoji: true },
              value: 'click_me_123',
              action_id: 'actionId-0',
            },
          ],
        },
      ],
    },
  },
  request_body: {},
};
