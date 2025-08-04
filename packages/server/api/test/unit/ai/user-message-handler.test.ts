import { logger } from '@openops/server-shared';
import { AiConfig, AiProviderEnum } from '@openops/shared';
import { CoreMessage, LanguageModel, TextStreamPart, ToolSet } from 'ai';
import { FastifyInstance } from 'fastify';
import { ServerResponse } from 'node:http';
import { handleUserMessage } from '../../../src/app/ai/chat/user-message-handler';

jest.mock('@openops/server-shared', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  system: {
    getNumberOrThrow: jest.fn().mockReturnValue(3),
  },
  AppSystemProp: {
    MAX_LLM_CALLS_WITHOUT_INTERACTION: 'MAX_LLM_CALLS_WITHOUT_INTERACTION',
  },
}));

jest.mock('../../../src/app/ai/mcp/tools-context-builder', () => ({
  getMCPToolsContext: jest.fn().mockResolvedValue({
    mcpClients: [],
    systemPrompt: 'test system prompt',
    filteredTools: {},
  }),
}));

jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  getLLMConfig: jest.fn(),
  getConversation: jest.fn(),
  saveChatHistory: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/app/ai/chat/ai-id-generators', () => ({
  generateMessageId: jest.fn().mockReturnValue('test-message-id'),
}));

jest.mock('../../../src/app/ai/chat/llm-stream-handler', () => ({
  getLLMAsyncStream: jest.fn(),
}));

jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendAiChatMessageSendEvent: jest.fn(),
  sendAiChatFailureEvent: jest.fn(),
}));

describe('User Message Handler', () => {
  const { getMCPToolsContext } = jest.requireMock(
    '../../../src/app/ai/mcp/tools-context-builder',
  );
  const { getLLMConfig, saveChatHistory } = jest.requireMock(
    '../../../src/app/ai/chat/ai-chat.service',
  );

  const { getLLMAsyncStream } = jest.requireMock(
    '../../../src/app/ai/chat/llm-stream-handler',
  );

  const mockServerResponse = {
    write: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse;

  const mockApp = {} as FastifyInstance;

  const mockAiConfig: AiConfig = {
    projectId: 'test-project-id',
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
    {
      role: 'user',
      content: 'Hello',
    },
  ];

  const mockNewMessage: CoreMessage = {
    role: 'user',
    content: 'How are you?',
  };

  const mockParams = {
    app: mockApp,
    userId: 'test-user-id',
    chatId: 'test-chat-id',
    projectId: 'test-project-id',
    authToken: 'test-auth-token',
    newMessage: mockNewMessage,
    serverResponse: mockServerResponse,
    aiConfig: mockAiConfig,
    languageModel: mockLanguageModel,
    conversation: {
      chatContext: { chatId: 'test-chat-id' },
      chatHistory: [...mockChatHistory],
    },
    frontendTools: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    getLLMConfig.mockResolvedValue({
      aiConfig: mockAiConfig,
      languageModel: mockLanguageModel,
    });

    getLLMAsyncStream.mockImplementation(
      ({ onFinish }: { onFinish: (result: unknown) => void }) => {
        const mockMessages = [
          {
            role: 'assistant',
            content: [{ type: 'text', text: 'I am an AI assistant.' }],
            id: 'test-message-id',
          },
        ];

        if (onFinish) {
          void onFinish({
            finishReason: 'stop',
            response: { messages: mockMessages },
          });
        }

        return (async function* () {
          yield {
            type: 'text-delta',
            textDelta: 'I am an AI assistant.',
          } as TextStreamPart<ToolSet>;
        })();
      },
    );
  });

  describe('handleUserMessage', () => {
    it('should process a user message and stream the response', async () => {
      await handleUserMessage(mockParams);

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('f:{"messageId":"test-message-id"}'),
      );

      expect(saveChatHistory).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello' }),
          expect.objectContaining({ role: 'user', content: 'How are you?' }),
          expect.objectContaining({
            role: 'assistant',
            content: [{ type: 'text', text: 'I am an AI assistant.' }],
          }),
        ]),
      );

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        'd:{"finishReason":"stop"}\n',
      );
      expect(mockServerResponse.end).toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      getLLMAsyncStream.mockImplementation(() => {
        throw new Error('Test error');
      });

      await handleUserMessage(mockParams);

      expect(logger.warn).toHaveBeenCalled();
      expect(mockServerResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('0:"\\n\\n"'),
      );
      expect(mockServerResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('0:"Test error"'),
      );
      expect(mockServerResponse.end).toHaveBeenCalled();
    });

    it('should close MCP clients even when an error occurs', async () => {
      const mockClose = jest.fn().mockResolvedValue(undefined);
      const mockMcpClient = { close: mockClose };

      getMCPToolsContext.mockResolvedValue({
        mcpClients: [mockMcpClient],
        systemPrompt: 'test system prompt',
        filteredTools: {},
      });

      getLLMAsyncStream.mockImplementation(() => {
        throw new Error('Test error');
      });

      await handleUserMessage(mockParams);

      expect(mockClose).toHaveBeenCalled();
    });
  });
});
