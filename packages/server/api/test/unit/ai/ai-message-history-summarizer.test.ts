import { AiProviderEnum } from '@openops/shared';
import { CoreMessage, LanguageModel } from 'ai';

const generateTextMock = jest.fn().mockResolvedValue({
  text: 'Summary content.',
});

const cacheWrapperMock = {
  getSerializedObject: jest.fn(),
  setSerializedObject: jest.fn(),
};

const distributedLockMock = {
  acquireLock: jest.fn().mockResolvedValue({
    release: jest.fn().mockResolvedValue(undefined),
  }),
};

jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  generateText: generateTextMock,
  APICallError: {
    isInstance: jest
      .fn()
      .mockImplementation((error) => error.name === 'APICallError'),
  },
}));

jest.mock('@openops/server-shared', () => ({
  system: {
    getNumberOrThrow: jest.fn().mockImplementation((prop) => {
      if (prop === 'MAX_TOKENS_FOR_HISTORY_SUMMARY') return 800;
      if (prop === 'MAX_USER_INTERACTIONS_FOR_SUMMARY') return 20;
      throw new Error('Invalid prop');
    }),
  },
  AppSystemProp: {
    MAX_TOKENS_FOR_HISTORY_SUMMARY: 'MAX_TOKENS_FOR_HISTORY_SUMMARY',
    MAX_USER_INTERACTIONS_FOR_SUMMARY: 'MAX_USER_INTERACTIONS_FOR_SUMMARY',
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
  cacheWrapper: cacheWrapperMock,
  distributedLock: distributedLockMock,
}));

let existingMessagesMock: CoreMessage[] = [];
jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  appendMessagesToChatHistoryContext: jest
    .fn()
    .mockImplementation(async (chatId, newMessages, summarizeCallback) => {
      if (summarizeCallback) {
        return summarizeCallback(existingMessagesMock);
      }

      return [...existingMessagesMock, ...newMessages];
    }),
  chatHistoryContextKey: jest
    .fn()
    .mockImplementation((chatId) => `${chatId}:context:history`),
}));

import {
  shouldTryToSummarize,
  summarizeChatHistoryContext,
} from '../../../src/app/ai/chat/ai-message-history-summarizer';

describe('ai-message-history-summarizer', () => {
  const languageModel = {} as LanguageModel;
  const aiConfig = {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldTryToSummarize', () => {
    it('should return true when message includes "tokens" and attemptIndex is less than 2', () => {
      expect(
        shouldTryToSummarize('This message has too many tokens', 1),
      ).toBeTruthy();
      expect(
        shouldTryToSummarize('This message has too many tokens', 0),
      ).toBeTruthy();
    });

    it('should return false when message includes "tokens" but attemptIndex is greater than 2', () => {
      expect(
        shouldTryToSummarize('This message has too many tokens', 2),
      ).toBeFalsy();
      expect(
        shouldTryToSummarize('This message has too many tokens', 3),
      ).toBeFalsy();
    });

    it('should return false when message does not include "tokens"', () => {
      expect(shouldTryToSummarize('This is a different error', 2)).toBeFalsy();
      expect(shouldTryToSummarize('This is a different error', 3)).toBeFalsy();
    });
  });

  describe('summarizeChatHistoryContext', () => {
    beforeEach(() => {
      existingMessagesMock = [];
      jest.clearAllMocks();
    });

    it('should summarize chat history context and return summarized messages', async () => {
      const result = await summarizeChatHistoryContext(
        languageModel,
        aiConfig,
        'test-chat-id',
      );

      expect(result).toEqual([
        {
          role: 'system',
          content: expect.stringContaining('Summary content.'),
        },
      ]);

      expect(generateTextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: languageModel,
          system: expect.stringContaining(
            'You are an expert at creating extremely concise conversation summaries',
          ),
          messages: expect.any(Array),
          maxTokens: expect.any(Number),
        }),
      );
    });

    it('should handle the case where the last message is from a user', async () => {
      existingMessagesMock.push(
        { role: 'user', content: 'Existing message 1' },
        { role: 'assistant', content: 'Existing response 1' },
        { role: 'user', content: 'Last user message' },
      );

      const result = await summarizeChatHistoryContext(
        languageModel,
        aiConfig,
        'test-chat-id',
      );

      expect(result).toEqual([
        {
          role: 'system',
          content: expect.stringContaining('Summary content.'),
        },
        {
          role: 'user',
          content: 'Last user message',
        },
      ]);
    });

    it('should return original messages if there is only one user message', async () => {
      existingMessagesMock = [{ role: 'user', content: 'Single user message' }];

      const result = await summarizeChatHistoryContext(
        languageModel,
        aiConfig,
        'test-chat-id',
      );

      expect(result).toEqual([
        { role: 'user', content: 'Single user message' },
      ]);
      expect(generateTextMock).not.toHaveBeenCalled();
    });

    it('should handle errors during summarization and return original messages', async () => {
      existingMessagesMock.push(
        { role: 'user', content: 'Existing message 1' },
        { role: 'assistant', content: 'Existing response 1' },
      );

      generateTextMock.mockRejectedValueOnce(new Error('Summarization failed'));

      const result = await summarizeChatHistoryContext(
        languageModel,
        aiConfig,
        'test-chat-id',
      );

      expect(result).toEqual(existingMessagesMock);
    });

    it('should handle API call errors by truncating messages and retrying', async () => {
      existingMessagesMock.push(
        { role: 'user', content: 'Existing message 1' },
        { role: 'assistant', content: 'Existing response 1' },
      );

      const apiError = new Error('API error');
      apiError.name = 'APICallError';

      generateTextMock
        .mockRejectedValueOnce(apiError)
        .mockResolvedValueOnce({ text: 'Truncated summary content.' });

      const result = await summarizeChatHistoryContext(
        languageModel,
        aiConfig,
        'test-chat-id',
      );

      expect(result).toEqual([
        {
          role: 'system',
          content: expect.stringContaining('Truncated summary content.'),
        },
      ]);

      expect(generateTextMock).toHaveBeenCalledTimes(2);
    });
  });
});
