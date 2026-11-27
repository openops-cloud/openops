jest.mock('@openops/server-shared', () => {
  const actual = jest.requireActual('@openops/server-shared');
  return {
    ...actual,
    system: {
      ...actual.system,
      getOrThrow: jest.fn().mockReturnValue('https://app.openops.com/'),
    },
    networkUtls: {
      ...actual.networkUtls,
      getPublicUrl: jest.fn().mockResolvedValue('https://api.openops.com'),
    },
  };
});

const sendChatOrChannelMessageMock = jest
  .fn()
  .mockResolvedValue({ id: 'message-1' });
jest.mock('../src/lib/common/send-chat-or-channel-message', () => ({
  sendChatOrChannelMessage: sendChatOrChannelMessageMock,
}));

jest.mock('../src/lib/common/wait-for-interaction', () => ({
  waitForInteraction: jest.fn().mockResolvedValue({}),
}));

import { ExecutionType } from '@openops/shared';
import { requestActionMessageAction } from '../src/lib/actions/request-action-message';

function buildContext(extraAction: Record<string, unknown>): any {
  return {
    executionType: ExecutionType.BEGIN,
    auth: { access_token: 'token' },
    propsValue: {
      chatOrChannel: { id: 'chat-1', type: 'chat' },
      header: 'Cost savings opportunity: vol-123',
      message: 'Message',
      actions: [
        { buttonText: 'Dismiss', buttonStyle: 'destructive' },
        { buttonText: 'Follow up', buttonStyle: 'default', ...extraAction },
      ],
      timeoutInDays: 3,
    },
    run: { pauseId: 'pause-1', isTest: false },
    currentExecutionPath: 'step_1',
    store: { put: jest.fn() },
    generateResumeUrl: jest.fn(
      ({ queryParams }: any) =>
        `https://api.openops.com/v1/flow-runs/run-1/requests/pause-1?${new URLSearchParams(queryParams)}`,
    ),
  };
}

function readForm(url: string): unknown {
  const encoded = new URL(url).searchParams.get('form') ?? '';
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
}

function sentButtons(): { buttonText: string; resumeUrl: string }[] {
  return sendChatOrChannelMessageMock.mock.calls[0][0].actions;
}

describe('microsoft teams requestActionMessageAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends a plain button to the resume page', async () => {
    await requestActionMessageAction.run(buildContext({}));

    expect(sentButtons()[1].resumeUrl).toContain(
      '/html/resume_execution.html?',
    );
  });

  test('turns a single follow-up question from an older flow into a one-field form', async () => {
    await requestActionMessageAction.run(
      buildContext({
        followUpQuestion: "What is the correct owner's email?",
        answerFormat: 'email',
        noAnswerOption: "I don't know the owner",
      }),
    );

    const url = sentButtons()[1].resumeUrl;
    expect(new URL(url).searchParams.has('question')).toBe(false);
    expect(readForm(url)).toEqual({
      title: 'Cost savings opportunity: vol-123',
      fields: [
        {
          name: 'answer',
          label: "What is the correct owner's email?",
          type: 'email',
          required: true,
        },
      ],
      skipLabel: "I don't know the owner",
    });
  });

  test('sends a form button with the form in its link and no heading unless the form has a title', async () => {
    await requestActionMessageAction.run(
      buildContext({
        followUpForm: {
          fields: [
            {
              name: 'reason',
              label: 'Exception reason',
              type: 'select',
              options: ['VendorSet'],
            },
          ],
        },
      }),
    );

    const url = sentButtons()[1].resumeUrl;
    expect(new URL(url).pathname).toBe('/html/collect_input.html');
    expect(readForm(url)).toEqual({
      fields: [
        {
          name: 'reason',
          label: 'Exception reason',
          type: 'select',
          options: ['VendorSet'],
          required: true,
        },
      ],
    });
  });

  test('fails before sending when the form is invalid', async () => {
    await expect(
      requestActionMessageAction.run(
        buildContext({ followUpForm: { fields: [{ name: 'path' }] } }),
      ),
    ).rejects.toThrow(/Invalid follow-up form/);
    expect(sendChatOrChannelMessageMock).not.toHaveBeenCalled();
  });
});
