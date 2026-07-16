const getBooleanMock = jest.fn();
const getOrThrowMock = jest
  .fn()
  .mockReturnValue('https://mocked-frontend-url.com');
jest.mock('@openops/server-shared', () => {
  const actual = jest.requireActual('@openops/server-shared');
  return {
    ...actual,
    system: {
      ...actual.system,
      getBoolean: getBooleanMock,
      getOrThrow: getOrThrowMock,
    },
    networkUtls: {
      ...actual.networkUtls,
      getPublicUrl: jest
        .fn()
        .mockResolvedValue('https://mocked-public-url.com'),
    },
  };
});

const slackSendMessageMock = jest.fn();

jest.mock('../src/lib/common/utils', () => ({
  ...jest.requireActual('../src/lib/common/utils'),
  slackSendMessage: slackSendMessageMock,
}));

const waitForInteractionMock = jest
  .fn()
  .mockImplementation(async (messageObj: any) =>
    Promise.resolve({ ...messageObj }),
  );
const onReceivedInteractionMock = jest.fn();

jest.mock('../src/lib/common/wait-for-interaction', () => ({
  waitForInteraction: waitForInteractionMock,
  onReceivedInteraction: onReceivedInteractionMock,
}));

import { StoreScope } from '@openops/blocks-framework';
import { ExecutionType } from '@openops/shared';
import { requestActionMessageAction } from '../src/lib/actions/request-action-message';
import { WaitForInteractionResult } from '../src/lib/common/wait-for-interaction';

describe('requestActionMessageAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('header functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      slackSendMessageMock.mockImplementation(async (message: any) =>
        Promise.resolve(message),
      );
    });

    test('should send a message with a header when header text is provided', async () => {
      const mockContextWithHeader = buildMockContext('This is a header', true);
      const response = (await requestActionMessageAction.run(
        mockContextWithHeader,
      )) as any;

      const textAreas = response.blocks.filter(
        (res: { type: string }) => res.type === 'section',
      );
      expect(textAreas.length).toEqual(2);

      const headerArea = textAreas.find(
        (res: { type: string; text: { type: string; text: string } }) =>
          res.text.text.includes(mockContextWithHeader.propsValue.header),
      );
      expect(headerArea).not.toBeNull();

      const message = textAreas.find(
        (res: { type: string; text: { type: string; text: string } }) =>
          res.text.text.includes(mockContextWithHeader.propsValue.text),
      );
      expect(message).not.toBeNull();

      const actions = response.blocks.find(
        (res: { type: string }) => res.type === 'actions',
      );
      expect(mockContextWithHeader.propsValue.actions.length).toEqual(
        actions.elements.length,
      );
    });

    test('should send a message without header when header text is not provided', async () => {
      const mockContextWithoutHeader = buildMockContext('', true);
      const response = (await requestActionMessageAction.run(
        mockContextWithoutHeader,
      )) as any;

      const textAreas = response.blocks.filter(
        (res: { type: string }) => res.type === 'section',
      );
      expect(textAreas.length).toEqual(1);

      const message = textAreas.find(
        (res: { type: string; text: { type: string; text: string } }) =>
          res.text.text.includes(mockContextWithoutHeader.propsValue.text),
      );
      expect(message).not.toBeNull();

      const actions = response.blocks.find(
        (res: { type: string }) => res.type === 'actions',
      );
      expect(mockContextWithoutHeader.propsValue.actions.length).toEqual(
        actions.elements.length,
      );
    });
  });

  describe('Popup functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      slackSendMessageMock.mockImplementation(async (message: any) =>
        Promise.resolve(message),
      );
    });

    test.each([
      ['popup text', 'popup text'],
      [' ', 'Are you sure?'],
      [null, 'Are you sure?'],
      [undefined, 'Are you sure?'],
    ])(
      'should send a message with an action with the confirmation popup',
      async (popupText, expectedPopText) => {
        const mockContextWithHeader = buildMockContext(
          'This is a header',
          true,
        );
        mockContextWithHeader.propsValue.actions[0].confirmationPrompt = true;
        mockContextWithHeader.propsValue.actions[0].confirmationPromptText =
          popupText;

        const response = (await requestActionMessageAction.run(
          mockContextWithHeader,
        )) as any;

        expect(slackSendMessageMock).toHaveBeenCalledTimes(1);

        const actions = response.blocks.find(
          (res: { type: string }) => res.type === 'actions',
        );
        expect(mockContextWithHeader.propsValue.actions.length).toEqual(
          actions.elements.length,
        );
        expect(actions.elements[0].confirm).not.toBeNull();
        expect(actions.elements[0].confirm.text.text).toBe(expectedPopText);
      },
    );

    test('should send a message without any confirmation popup', async () => {
      const mockContextWithHeader = buildMockContext('This is a header', true);

      const response = (await requestActionMessageAction.run(
        mockContextWithHeader,
      )) as any;

      expect(slackSendMessageMock).toHaveBeenCalledTimes(1);

      const actions = response.blocks.find(
        (res: { type: string }) => res.type === 'actions',
      );
      expect(mockContextWithHeader.propsValue.actions.length).toEqual(
        actions.elements.length,
      );
      expect(actions.elements[0].confirm).toBeUndefined();
    });
  });

  test('should throw an error when there are no actions provided', async () => {
    const mockContextWithoutActions = buildMockContext(
      'This is a header',
      false,
    );
    await expect(() =>
      requestActionMessageAction.run(mockContextWithoutActions),
    ).rejects.toThrow('Must have at least one button action');
  });

  describe('BEGIN execution', () => {
    test('should send a message and return placeholder response values', async () => {
      waitForInteractionMock.mockResolvedValueOnce({
        user: 'a user',
        action: 'an action',
        isExpired: undefined,
        message: 'aaaa',
      });
      slackSendMessageMock.mockResolvedValueOnce('some message');

      const mockContextWithHeader = buildMockContext('This is a header', true);
      const response = (await requestActionMessageAction.run(
        mockContextWithHeader,
      )) as WaitForInteractionResult;

      expect(response).toStrictEqual({
        user: 'a user',
        action: 'an action',
        isExpired: undefined,
        message: 'aaaa',
      });

      expect(slackSendMessageMock).toHaveBeenCalledTimes(1);

      expect(slackSendMessageMock).toHaveBeenCalledWith({
        token: mockContextWithHeader.auth.access_token,
        text: mockContextWithHeader.propsValue.text,
        username: mockContextWithHeader.propsValue.username,
        conversationId: mockContextWithHeader.propsValue.conversationId,
        blocks: expect.any(Array),
        eventPayload: {
          domain: mockContextWithHeader.server.publicUrl,
          resumeUrl: undefined,
          interactionsDisabled: false,
          followUpActions: [],
        },
      });

      expect(waitForInteractionMock).toHaveBeenCalledTimes(1);
      expect(waitForInteractionMock).toHaveBeenCalledWith(
        'some message',
        1,
        mockContextWithHeader,
        mockContextWithHeader.currentExecutionPath,
      );
      expect(onReceivedInteractionMock).not.toHaveBeenCalled();
    });

    test('should store the sent message in the store', async () => {
      slackSendMessageMock.mockResolvedValueOnce('some message');

      const mockContextWithHeader = buildMockContext('This is a header', true);
      await requestActionMessageAction.run(mockContextWithHeader);

      expect(mockContextWithHeader.store.put).toHaveBeenCalledTimes(1);
      expect(mockContextWithHeader.store.put).toHaveBeenCalledWith(
        'slackMessage_' + mockContextWithHeader.currentExecutionPath,
        'some message',
        StoreScope.FLOW_RUN,
      );
    });

    test('should assign resumeUrl to actions when slack interactions are disabled', async () => {
      getBooleanMock.mockReturnValueOnce(false);
      waitForInteractionMock.mockImplementation(async (messageObj: any) =>
        Promise.resolve({ ...messageObj }),
      );
      slackSendMessageMock.mockImplementation(async (message: any) =>
        Promise.resolve(message),
      );

      const mockContext = buildMockContext('Header Text', true);
      mockContext.run.isTest = false;
      mockContext.generateResumeUrl.mockImplementation(
        ({ queryParams }: any) => {
          const query = new URLSearchParams(queryParams).toString();
          return `https://example.com/resume?${query}`;
        },
      );

      const result = (await requestActionMessageAction.run(mockContext)) as any;

      const actionBlock = result.blocks.find((b: any) => b.type === 'actions');
      expect(actionBlock).toBeDefined();
      const action = actionBlock.elements[0];

      expect(action.url).toBeDefined();
      expect(action.url).toContain('https%3A%2F%2Fexample.com');
      expect(action.url).toContain(
        'actionClicked%3D%257B%2522value%2522%253A%2522Approve%2522%252C%2522displayText%2522%253A%2522Approve%2522%257D',
      );

      expect(result.eventPayload.resumeUrl).toContain('executionCorrelationId');
      expect(result.eventPayload.interactionsDisabled).toBe(true);
    });

    test('should set isTest flag in static test url to actions in test mode when interactions are disabled', async () => {
      getBooleanMock.mockReturnValueOnce(false);
      waitForInteractionMock.mockImplementation(async (messageObj: any) =>
        Promise.resolve({ ...messageObj }),
      );
      slackSendMessageMock.mockImplementation(async (message: any) =>
        Promise.resolve(message),
      );
      const mockContext = buildMockContext('Header Text', true);
      mockContext.run.isTest = true;

      const result = (await requestActionMessageAction.run(mockContext)) as any;

      const actionBlock = result.blocks.find((b: any) => b.type === 'actions');
      expect(actionBlock).toBeDefined();
      const action = actionBlock.elements[0];

      expect(action.url).toBe(
        'https://mocked-frontend-url.com/html/resume_execution.html?isTest=true&redirectUrl=undefined',
      );
      expect(result.eventPayload.interactionsDisabled).toBe(true);
    });

    test.each([null, undefined, true])(
      'should NOT assign resumeUrl to actions when SLACK_ENABLE_INTERACTIONS is %s',
      async (slackEnableInteractions) => {
        getBooleanMock.mockReturnValueOnce(slackEnableInteractions);
        waitForInteractionMock.mockImplementation(async (messageObj: any) =>
          Promise.resolve({ ...messageObj }),
        );
        slackSendMessageMock.mockImplementation(async (message: any) =>
          Promise.resolve(message),
        );

        const mockContext = buildMockContext('Header Text', true);
        mockContext.run.isTest = false;
        mockContext.generateResumeUrl.mockImplementation(
          ({ queryParams }: any) => {
            const query = new URLSearchParams(queryParams).toString();
            return `https://example.com/resume?${query}`;
          },
        );

        const result = (await requestActionMessageAction.run(
          mockContext,
        )) as any;

        const actionBlock = result.blocks.find(
          (b: any) => b.type === 'actions',
        );
        expect(actionBlock).toBeDefined();
        const action = actionBlock.elements[0];

        expect(action.url).not.toBeDefined();

        expect(result.eventPayload.resumeUrl).toContain(
          'executionCorrelationId=',
        );
        expect(result.eventPayload.interactionsDisabled).toBe(false);
      },
    );
  });

  describe('follow-up question buttons', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      waitForInteractionMock.mockImplementation(async (messageObj: any) =>
        Promise.resolve({ ...messageObj }),
      );
      slackSendMessageMock.mockImplementation(async (message: any) =>
        Promise.resolve(message),
      );
    });

    function buildContextWithFollowUpAction(): any {
      const mockContext = buildMockContext('Header Text', true);
      mockContext.propsValue.actions.push({
        buttonText: "I'm not the owner",
        buttonStyle: '',
        followUpQuestion: "What is the correct owner's email?",
        answerFormat: 'email',
        noAnswerOption: "I don't know the owner",
      });
      mockContext.run.isTest = false;
      mockContext.generateResumeUrl.mockImplementation(
        ({ queryParams }: any) => {
          const query = new URLSearchParams(queryParams).toString();
          return `https://example.com/resume?${query}`;
        },
      );
      return mockContext;
    }

    test('should give only the follow-up button a collect_input url in interactions mode', async () => {
      getBooleanMock.mockReturnValueOnce(true);

      const mockContext = buildContextWithFollowUpAction();
      const result = (await requestActionMessageAction.run(mockContext)) as any;

      const actionBlock = result.blocks.find((b: any) => b.type === 'actions');
      const [plainButton, followUpButton] = actionBlock.elements;

      expect(plainButton.url).not.toBeDefined();

      expect(followUpButton.url).toContain('/html/collect_input.html?');
      const params = new URL(followUpButton.url).searchParams;
      expect(params.get('question')).toBe("What is the correct owner's email?");
      expect(params.get('format')).toBe('email');
      expect(params.get('noAnswerOption')).toBe("I don't know the owner");
      expect(params.get('title')).toBe('Header Text');
      expect(params.get('redirectUrl')).toContain(
        'executionCorrelationId=pause_123',
      );
      expect(params.get('redirectUrl')).toContain('actionClicked=');
      expect(result.eventPayload.interactionsDisabled).toBe(false);
    });

    test('should wrap all buttons in non-interaction mode and use collect_input for the follow-up one', async () => {
      getBooleanMock.mockReturnValueOnce(false);

      const mockContext = buildContextWithFollowUpAction();
      const result = (await requestActionMessageAction.run(mockContext)) as any;

      const actionBlock = result.blocks.find((b: any) => b.type === 'actions');
      const [plainButton, followUpButton] = actionBlock.elements;

      expect(plainButton.url).toContain('/html/resume_execution.html?');
      expect(followUpButton.url).toContain('/html/collect_input.html?');
      expect(result.eventPayload.interactionsDisabled).toBe(true);
    });

    test('should list exactly the follow-up button texts in eventPayload.followUpActions', async () => {
      getBooleanMock.mockReturnValueOnce(true);

      const mockContext = buildContextWithFollowUpAction();
      const result = (await requestActionMessageAction.run(mockContext)) as any;

      expect(result.eventPayload.followUpActions).toEqual([
        "I'm not the owner",
      ]);
    });

    test('should store emoji-shortcode form in followUpActions and the actionClicked value', async () => {
      getBooleanMock.mockReturnValueOnce(true);

      const mockContext = buildContextWithFollowUpAction();
      mockContext.propsValue.actions[1].buttonText = '🎲 Reroll';
      const result = (await requestActionMessageAction.run(mockContext)) as any;

      expect(result.eventPayload.followUpActions).toEqual([
        ':game_die: Reroll',
      ]);

      const { queryParams } = mockContext.generateResumeUrl.mock.calls[0][0];
      expect(JSON.parse(queryParams.actionClicked)).toEqual({
        value: ':game_die: Reroll',
        displayText: '🎲 Reroll',
      });
    });
  });

  describe('RESUME execution', () => {
    test('should throw an error when there is no message stored in the store', async () => {
      const mockContextWithHeader = buildMockContext('This is a header', true);
      mockContextWithHeader.executionType = ExecutionType.RESUME;

      await expect(
        requestActionMessageAction.run(mockContextWithHeader),
      ).rejects.toThrow(
        'Could not fetch slack message from store, context.currentExecutionPath: some step 123',
      );

      expect(mockContextWithHeader.store.get).toHaveBeenCalledTimes(1);
      expect(mockContextWithHeader.store.get).toHaveBeenCalledWith(
        'slackMessage_' + mockContextWithHeader.currentExecutionPath,
        StoreScope.FLOW_RUN,
      );
      expect(mockContextWithHeader.store.put).not.toHaveBeenCalled();
    });

    test('should call onReceivedInteraction when there is a message stored in the store', async () => {
      onReceivedInteractionMock.mockResolvedValue({
        user: 'a user',
        action: 'an action',
        isExpired: undefined,
        message: 'aaaa',
      });

      const mockContextWithHeader = buildMockContext('This is a header', true);
      mockContextWithHeader.store.get.mockResolvedValueOnce('aaaa');
      mockContextWithHeader.executionType = ExecutionType.RESUME;

      const response = (await requestActionMessageAction.run(
        mockContextWithHeader,
      )) as WaitForInteractionResult;

      expect(response).toStrictEqual({
        user: 'a user',
        action: 'an action',
        isExpired: undefined,
        message: 'aaaa',
      });

      expect(onReceivedInteractionMock).toHaveBeenCalledTimes(1);
      expect(onReceivedInteractionMock).toHaveBeenCalledWith(
        'aaaa',
        ['Approve'],
        mockContextWithHeader,
        mockContextWithHeader.currentExecutionPath,
      );
      expect(waitForInteractionMock).not.toHaveBeenCalled();

      expect(mockContextWithHeader.store.get).toHaveBeenCalledTimes(1);
      expect(mockContextWithHeader.store.get).toHaveBeenCalledWith(
        'slackMessage_' + mockContextWithHeader.currentExecutionPath,
        StoreScope.FLOW_RUN,
      );
      expect(mockContextWithHeader.store.put).not.toHaveBeenCalled();
    });
  });
});

function buildMockContext(header: string, containsActions: boolean): any {
  const actions = containsActions
    ? [
        {
          buttonText: 'Approve',
          buttonStyle: 'danger',
        },
      ]
    : [];

  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: {
      access_token: 'fake_token',
    },
    propsValue: {
      headerText: header,
      text: 'Text to text',
      username: 'usernametest',
      actions: actions,
      conversationId: 'conversationId',
      timeoutInDays: 1,
    },
    currentExecutionPath: 'some step 123',
    executionType: ExecutionType.BEGIN,
    server: {
      publicUrl: 'http://example.com',
    },
    run: {
      pauseId: 'pause_123',
      pause: jest.fn(),
    },
    serverUrl: 'http://example.com',
    generateResumeUrl: jest.fn(),
    store: {
      get: jest.fn(),
      put: jest.fn(),
    },
  };
}
