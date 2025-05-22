import { AiConfig, AiProviderEnum } from '@openops/shared';

const generateTextMock = jest.fn().mockResolvedValue({
  text: 'Summary content.',
});
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  generateText: generateTextMock,
}));

jest.mock('@openops/server-shared', () => ({
  system: {
    getNumberOrThrow: jest.fn().mockImplementation((prop: AppSystemProp) => {
      if (prop === AppSystemProp.MAX_TOKENS_IN_LLM_HISTORY) return 800;
      if (prop === AppSystemProp.MAX_MESSAGES_IN_LLM_HISTORY) return 20;

      throw new Error('Invalid prop');
    }),
  },
  AppSystemProp: {
    MAX_TOKENS_IN_LLM_HISTORY: 'MAX_TOKENS_IN_LLM_HISTORY',
    MAX_MESSAGES_IN_LLM_HISTORY: 'MAX_MESSAGES_IN_LLM_HISTORY',
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

import { AppSystemProp } from '@openops/server-shared';
import { CoreMessage, LanguageModel } from 'ai';
import { summarizeMessages } from '../../../src/app/ai/chat/ai-message-history-summarizer';

describe('summarizeMessages', () => {
  const languageModel = {} as LanguageModel;
  const aiConfig: AiConfig = {
    modelSettings: {
      maxTokens: 1000,
    },
    projectId: '',
    provider: AiProviderEnum.OPENAI,
    model: 'gpt-4o-mini',
    apiKey: '',
    id: '',
    created: '',
    updated: '',
  };

  const mockMessages: CoreMessage[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all messages if totalTokens is below value defined in model settings', async () => {
    const result = await summarizeMessages(
      languageModel,
      aiConfig,
      mockMessages,
      200,
    );

    expect(result).toEqual(mockMessages);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('should summarize messages if totalTokens exceeds maxTokens defined in model settings', async () => {
    const result = await summarizeMessages(
      languageModel,
      aiConfig,
      mockMessages,
      1001,
    );

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: languageModel,
        system: expect.any(String),
        messages: mockMessages,
        maxTokens: 500,
      }),
    );

    expect(result).toEqual([
      {
        role: 'system',
        content: expect.stringContaining('Summary content.'),
      },
    ]);
  });

  it('should use system default maxTokens if model settings maxTokens is undefined', async () => {
    const configWithoutMax = { modelSettings: {} } as AiConfig;

    const result = await summarizeMessages(
      languageModel,
      configWithoutMax,
      mockMessages,
      1001,
    );

    expect(result).toEqual([
      {
        role: 'system',
        content: expect.stringContaining('Summary content.'),
      },
    ]);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 400,
      }),
    );
  });

  it('should bypass summarization if totalTokens is NaN and message count is under limit', async () => {
    const result = await summarizeMessages(
      languageModel,
      aiConfig,
      mockMessages,
      NaN,
    );

    expect(result).toEqual(mockMessages);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('should summarize if totalTokens is NaN and message count exceeds limit', async () => {
    const longMessages: CoreMessage[] = Array.from({ length: 50 }, (_, i) => ({
      role: 'user',
      content: `Message ${i}`,
    }));

    const result = await summarizeMessages(
      languageModel,
      aiConfig,
      longMessages,
      NaN,
    );

    expect(result).toEqual([
      {
        role: 'system',
        content: expect.stringContaining('Summary content.'),
      },
    ]);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 500,
      }),
    );
  });
});
