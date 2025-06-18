import { logger, system } from '@openops/server-shared';
import { AiConfig, AiProviderEnum } from '@openops/shared';
import { CoreMessage, LanguageModel, streamText } from 'ai';

jest.mock('@openops/server-shared', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  AppSystemProp: {
    MAX_LLM_CALLS_WITHOUT_INTERACTION: 'MAX_LLM_CALLS_WITHOUT_INTERACTION',
  },
  system: {
    getNumberOrThrow: jest.fn().mockReturnValue(5),
  },
}));

jest.mock('ai', () => {
  const originalModule = jest.requireActual('ai');
  return {
    ...originalModule,
    streamText: jest.fn(),
  };
});

import { streamAIResponse } from '../../../src/app/ai/chat/ai-stream-handler';

describe('ai-stream-handler', () => {
  const mockMaxRecursionDepth = 5;

  const mockAiConfig: AiConfig = {
    projectId: 'project-123',
    provider: AiProviderEnum.ANTHROPIC,
    model: 'claude-3-sonnet',
    apiKey: 'test-api-key',
    enabled: true,
    providerSettings: {},
    modelSettings: {},
    created: '2023-01-01',
    updated: '2023-01-01',
    id: 'test-id',
  };

  const mockLanguageModel = {} as LanguageModel;

  const mockChatHistory: CoreMessage[] = [
    { role: 'user', content: 'Previous message' },
    { role: 'assistant', content: 'Previous response' },
  ];

  const mockNewMessages: CoreMessage[] = [];

  const mockServerResponse = {
    write: jest.fn(),
  } as unknown as NodeJS.WritableStream;

  const createMockTextStream = (textParts: string[]) => {
    return {
      async *[Symbol.asyncIterator]() {
        for (const part of textParts) {
          yield part;
        }
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (system.getNumberOrThrow as jest.Mock).mockReturnValue(
      mockMaxRecursionDepth,
    );

    (streamText as jest.Mock).mockReturnValue({
      textStream: createMockTextStream(['Hello', ' world', '!']),
    });
  });

  describe('streamAIResponse', () => {
    it('should stream AI response successfully', async () => {
      await streamAIResponse({
        tools: undefined,
        aiConfig: mockAiConfig,
        systemPrompt: 'Test system prompt',
        newMessages: mockNewMessages,
        chatHistory: mockChatHistory,
        languageModel: mockLanguageModel,
        serverResponse: mockServerResponse,
      });

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockLanguageModel,
          system: 'Test system prompt',
          messages: mockChatHistory,
          toolChoice: 'none',
          maxRetries: 1,
          maxSteps: mockMaxRecursionDepth,
        }),
      );

      expect(mockServerResponse.write).toHaveBeenCalledTimes(3);
      expect(mockServerResponse.write).toHaveBeenNthCalledWith(
        1,
        '0:"Hello"\n',
      );
      expect(mockServerResponse.write).toHaveBeenNthCalledWith(
        2,
        '0:" world"\n',
      );
      expect(mockServerResponse.write).toHaveBeenNthCalledWith(3, '0:"!"\n');
    });

    it('should use tools when provided', async () => {
      const mockTools = {
        tool1: {
          description: 'Test tool',
          parameters: {},
        },
      };

      await streamAIResponse({
        tools: mockTools,
        aiConfig: mockAiConfig,
        systemPrompt: 'Test system prompt',
        newMessages: mockNewMessages,
        chatHistory: mockChatHistory,
        languageModel: mockLanguageModel,
        serverResponse: mockServerResponse,
      });

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
          toolChoice: 'auto',
        }),
      );
    });

    it('should handle onStepFinish callback when max recursion depth is reached', async () => {
      (streamText as jest.Mock).mockImplementation(({ onStepFinish }) => {
        for (let i = 0; i < mockMaxRecursionDepth; i++) {
          onStepFinish({ finishReason: 'tool_calls' });
        }

        return {
          textStream: createMockTextStream(['Response after max recursion']),
        };
      });

      await streamAIResponse({
        tools: undefined,
        aiConfig: mockAiConfig,
        systemPrompt: 'Test system prompt',
        newMessages: mockNewMessages,
        chatHistory: mockChatHistory,
        languageModel: mockLanguageModel,
        serverResponse: mockServerResponse,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        `Maximum recursion depth (${mockMaxRecursionDepth}) reached. Terminating recursion.`,
      );

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        `0:${JSON.stringify(
          `Maximum recursion depth (${mockMaxRecursionDepth}) reached. Terminating recursion.`,
        )}\n`,
      );
    });

    it('should add response messages to newMessages array', async () => {
      const responseMessages: CoreMessage[] = [
        { role: 'assistant', content: 'Test response' },
      ];

      (streamText as jest.Mock).mockImplementation(({ onFinish }) => {
        onFinish({
          finishReason: 'stop',
          response: { messages: responseMessages },
        });
        return {
          textStream: createMockTextStream(['Test response']),
        };
      });

      const newMessages: CoreMessage[] = [];

      await streamAIResponse({
        tools: undefined,
        aiConfig: mockAiConfig,
        systemPrompt: 'Test system prompt',
        newMessages,
        chatHistory: mockChatHistory,
        languageModel: mockLanguageModel,
        serverResponse: mockServerResponse,
      });

      expect(newMessages).toEqual(responseMessages);
    });
  });
});
