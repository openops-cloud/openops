const slackUpdateMessageMock = jest.fn();

jest.mock('../src/lib/common/utils', () => ({
  ...jest.requireActual('../src/lib/common/utils'),
  slackUpdateMessage: slackUpdateMessageMock,
}));

import { StoreScope } from '@openops/blocks-framework';
import { MessageInfo } from '../src/lib/common/message-result';
import {
  onReceivedInteraction,
  waitForInteraction,
} from '../src/lib/common/wait-for-interaction';

describe('wait-for-interaction', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    slackUpdateMessageMock.mockResolvedValue('updated message');
  });

  describe('waitForInteraction', () => {
    test('should pause flow and return placeholder values', async () => {
      const pauseMock = jest.fn();
      const messageObj: MessageInfo = createMockMessage();
      const context = createMockContext({
        run: { pause: pauseMock, pauseId: 'pause_123' },
      });

      const result = await waitForInteraction(messageObj, 1, context, 'step_1');

      expect(result).toEqual({
        user: '',
        action: '',
        userSelection: null,
        isExpired: undefined,
        message: messageObj,
      });

      expect(pauseMock).toHaveBeenCalledTimes(1);
      expect(context.store.put).toHaveBeenCalledTimes(1);
      expect(context.store.put).toHaveBeenCalledWith(
        'pauseMetadata_step_1',
        expect.objectContaining({
          executionCorrelationId: 'pause_123',
          resumeDateTime: expect.any(String),
        }),
        StoreScope.FLOW_RUN,
      );
    });
  });

  describe('onReceivedInteraction', () => {
    describe('expired message', () => {
      test('should return expired message when no action clicked', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {},
          },
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['Action 1'],
          context,
          'step_1',
        );

        expect(result).toEqual({
          user: '',
          action: '',
          userSelection: null,
          isExpired: true,
          message: 'updated message',
        });

        expect(slackUpdateMessageMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('emoji normalization - single select', () => {
      test('should return original action with emoji when button has emoji', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: ':game_die: Reroll',
                displayText: ':game_die: Reroll',
              }),
              path: 'step_1',
            },
          },
          store: {
            get: jest.fn().mockResolvedValue({
              executionCorrelationId: 'pause_123',
              resumeDateTime: new Date().toISOString(),
            }),
          },
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['🎲 Reroll', '✅ Confirm'],
          context,
          'step_1',
        );

        expect(result.action).toBe('🎲 Reroll');
        expect(result.user).toBe('test_user');
        expect(result.isExpired).toBe(false);
        expect(result.userSelection).toEqual({
          value: ':game_die: Reroll',
          displayText: ':game_die: Reroll',
        });
      });

      test('should return original action when matching via userSelection.value', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'some_other_type',
              actionClicked: JSON.stringify({
                value: ':white_check_mark: Confirm',
                displayText: ':white_check_mark: Confirm',
              }),
              path: 'step_1',
            },
          },
          store: {
            get: jest.fn().mockResolvedValue({
              executionCorrelationId: 'pause_123',
              resumeDateTime: new Date().toISOString(),
            }),
          },
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['🎲 Reroll', '✅ Confirm'],
          context,
          'step_1',
        );

        expect(result.action).toBe('✅ Confirm');
        expect(result.user).toBe('test_user');
      });

      test('should return original action when button has emoji in :emoji: notation', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: ':game_die: Reroll',
                displayText: ':game_die: Reroll',
              }),
              path: 'step_1',
            },
          },
          store: {
            get: jest.fn().mockResolvedValue({
              executionCorrelationId: 'pause_123',
              resumeDateTime: new Date().toISOString(),
            }),
          },
        });

        const result = await onReceivedInteraction(
          messageObj,
          [':game_die: Reroll', ':white_check_mark: Confirm'],
          context,
          'step_1',
        );

        expect(result.action).toBe(':game_die: Reroll');
        expect(result.user).toBe('test_user');
        expect(result.isExpired).toBe(false);
        expect(result.userSelection).toEqual({
          value: ':game_die: Reroll',
          displayText: ':game_die: Reroll',
        });
      });

      test('should return original action when button has only text and not emoji', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: 'Approve',
                displayText: 'Approve',
              }),
              path: 'step_1',
            },
          },
          store: {
            get: jest.fn().mockResolvedValue({
              executionCorrelationId: 'pause_123',
              resumeDateTime: new Date().toISOString(),
            }),
          },
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['Approve', 'Reject'],
          context,
          'step_1',
        );

        expect(result.action).toBe('Approve');
        expect(result.user).toBe('test_user');
        expect(result.isExpired).toBe(false);
        expect(result.userSelection).toEqual({
          value: 'Approve',
          displayText: 'Approve',
        });
      });
    });

    describe('multi select', () => {
      test('should return values array from userSelection for multi-select', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'multi_static_select',
              actionClicked: JSON.stringify([
                {
                  value: 'value 1',
                  displayText: 'text 1',
                },
                {
                  value: 'value 2',
                  displayText: 'text 2',
                },
              ]),
              path: 'step_1',
            },
          },
          store: {
            get: jest.fn().mockResolvedValue({
              executionCorrelationId: 'pause_123',
              resumeDateTime: new Date().toISOString(),
            }),
          },
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['multi_static_select'],
          context,
          'step_1',
        );

        expect(result.action).toEqual(['value 1', 'value 2']);
        expect(result.user).toBe('test_user');
        expect(result.isExpired).toBe(false);
        expect(result.userSelection).toEqual([
          {
            value: 'value 1',
            displayText: 'text 1',
          },
          {
            value: 'value 2',
            displayText: 'text 2',
          },
        ]);
      });
    });

    describe('path and action matching', () => {
      test('should pause flow when path does not match', async () => {
        const pauseMock = jest.fn();
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          run: { pause: pauseMock },
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: ':game_die: Reroll',
                displayText: ':game_die: Reroll',
              }),
              path: 'step_2',
            },
          },
        });

        context.store.get.mockResolvedValue({
          executionCorrelationId: 'pause_123',
          resumeDateTime: new Date().toISOString(),
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['🎲 Reroll'],
          context,
          'step_1',
        );

        expect(result).toEqual({
          user: '',
          action: '',
          userSelection: null,
          isExpired: undefined,
          message: messageObj,
        });

        expect(pauseMock).toHaveBeenCalledTimes(1);
        expect(context.store.get).toHaveBeenCalledWith(
          'pauseMetadata_step_1',
          StoreScope.FLOW_RUN,
        );
      });

      test('should pause flow when action does not match', async () => {
        const pauseMock = jest.fn();
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          run: { pause: pauseMock },
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: ':unknown: Action',
                displayText: ':unknown: Action',
              }),
              path: 'step_1',
            },
          },
        });

        context.store.get.mockResolvedValue({
          executionCorrelationId: 'pause_123',
          resumeDateTime: new Date().toISOString(),
        });

        const result = await onReceivedInteraction(
          messageObj,
          ['🎲 Reroll'],
          context,
          'step_1',
        );

        expect(result).toEqual({
          user: '',
          action: '',
          userSelection: null,
          isExpired: undefined,
          message: messageObj,
        });

        expect(pauseMock).toHaveBeenCalledTimes(1);
      });

      test('should throw error when pauseMetadata is missing', async () => {
        const pauseMock = jest.fn();
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          run: { pause: pauseMock },
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: ':unknown: Action',
                displayText: ':unknown: Action',
              }),
              path: 'step_1',
            },
          },
        });

        context.store.get.mockResolvedValue(null);

        await expect(
          onReceivedInteraction(messageObj, ['🎲 Reroll'], context, 'step_1'),
        ).rejects.toThrow('Could not fetch pause metadata: step_1');
      });
    });

    describe('message updates', () => {
      test('should update message with action received block', async () => {
        const messageObj: MessageInfo = createMockMessage();
        const context = createMockContext({
          resumePayload: {
            queryParams: {
              userName: 'test_user',
              actionType: 'button',
              actionClicked: JSON.stringify({
                value: ':game_die: Reroll',
                displayText: ':game_die: Reroll',
              }),
              path: 'step_1',
            },
          },
          store: {
            get: jest.fn().mockResolvedValue({
              executionCorrelationId: 'pause_123',
              resumeDateTime: new Date().toISOString(),
            }),
          },
        });

        await onReceivedInteraction(
          messageObj,
          ['🎲 Reroll'],
          context,
          'step_1',
        );

        expect(slackUpdateMessageMock).toHaveBeenCalledTimes(1);
        expect(slackUpdateMessageMock).toHaveBeenCalledWith(
          expect.objectContaining({
            token: 'some token',
            conversationId: 'C123456',
            messageTimestamp: '1234567890.123456',
            blocks: expect.arrayContaining([
              expect.objectContaining({
                type: 'section',
                text: expect.objectContaining({
                  text: expect.stringContaining('Action received'),
                }),
              }),
            ]),
          }),
        );
      });
    });
  });
});

function createMockContext(params?: {
  run?: { pause?: jest.Mock; pauseId?: string };
  resumePayload?: {
    queryParams?: {
      userName?: string;
      actionType?: string;
      actionClicked?: string;
      path?: string;
    };
  };
  store?: {
    get?: jest.Mock;
    put?: jest.Mock;
  };
}) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: {
      access_token: 'some token',
    },
    run: params?.run ?? { pause: jest.fn(), pauseId: 'pause_123' },
    resumePayload: params?.resumePayload,
    store: {
      get: params?.store?.get ?? jest.fn(),
      put: params?.store?.put ?? jest.fn(),
    },
  };
}

function createMockMessage(): MessageInfo {
  return {
    success: true,
    response_body: {
      channel: 'C123456',
      ts: '1234567890.123456',
      message: {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Test message',
            },
          },
        ],
        metadata: {
          event_type: 'slack-message',
          event_payload: {
            resumeUrl: 'https://test.com/?path=step_1',
          },
        },
      },
    },
    request_body: {},
  };
}
