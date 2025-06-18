import { logger } from '@openops/server-shared';
import { AiConfig, AiProviderEnum } from '@openops/shared';
import { CoreMessage, LanguageModelV1 } from 'ai';
import { FastifyInstance } from 'fastify';

jest.mock('@openops/server-shared', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendAiChatFailureEvent: jest.fn(),
  sendAiChatMessageSendEvent: jest.fn(),
}));

const generateMessageIdMock = jest.fn();
jest.mock('../../../src/app/ai/chat/ai-message-id-generator', () => ({
  generateMessageId: generateMessageIdMock,
}));

const appendMessagesToChatHistoryMock = jest.fn();
const appendMessagesToChatHistoryContextMock = jest.fn();
const saveChatHistoryContextMock = jest.fn();
jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  appendMessagesToChatHistory: appendMessagesToChatHistoryMock,
  appendMessagesToChatHistoryContext: appendMessagesToChatHistoryContextMock,
  saveChatHistoryContext: saveChatHistoryContextMock,
}));

const streamAIResponseMock = jest.fn();
jest.mock('../../../src/app/ai/chat/ai-stream-handler', () => ({
  streamAIResponse: streamAIResponseMock,
}));

const getMCPToolsContextMock = jest.fn();
jest.mock('../../../src/app/ai/chat/tools.service', () => ({
  getMCPToolsContext: getMCPToolsContextMock,
}));

import { handleUserMessage } from '../../../src/app/ai/chat/ai-response-handler';
import {
  sendAiChatFailureEvent,
  sendAiChatMessageSendEvent,
} from '../../../src/app/telemetry/event-models';

describe('ai-response-handler', () => {
  const mockUserId = 'user-123';
  const mockChatId = 'chat-123';
  const mockProjectId = 'project-123';
  const mockAuthToken = 'auth-token-123';
  const mockMessageId = 'msg-abcdef123456789';

  const mockAiConfig: AiConfig = {
    projectId: mockProjectId,
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

  const mockLanguageModel = {} as LanguageModelV1;

  const mockNewMessage: CoreMessage = {
    role: 'user',
    content: 'Test message',
  };

  const mockChatHistory: CoreMessage[] = [
    { role: 'user', content: 'Previous message' },
    { role: 'assistant', content: 'Previous response' },
  ];

  const mockServerResponse = {
    write: jest.fn(),
    end: jest.fn(),
  } as unknown as NodeJS.WritableStream;

  const mockApp = {} as FastifyInstance;

  const mockMcpClients = [{ close: jest.fn() }, { close: jest.fn() }];

  const mockFilteredTools = {
    tool1: {
      description: 'Test tool',
      parameters: {},
    },
  };

  const mockSystemPrompt = 'Test system prompt';

  beforeEach(() => {
    jest.clearAllMocks();

    generateMessageIdMock.mockReturnValue(mockMessageId);
    appendMessagesToChatHistoryContextMock.mockResolvedValue([
      ...mockChatHistory,
      mockNewMessage,
    ]);
    getMCPToolsContextMock.mockResolvedValue({
      mcpClients: mockMcpClients,
      filteredTools: mockFilteredTools,
      systemPrompt: mockSystemPrompt,
    });
    streamAIResponseMock.mockImplementation(({ newMessages }) => {
      newMessages.push({ role: 'assistant', content: 'Test response' });
      return Promise.resolve();
    });
  });

  describe('handleUserMessage', () => {
    it('should process user message and stream AI response', async () => {
      await handleUserMessage({
        userId: mockUserId,
        chatId: mockChatId,
        projectId: mockProjectId,
        serverResponse: mockServerResponse,
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
        authToken: mockAuthToken,
        app: mockApp,
        newMessage: mockNewMessage,
      });

      expect(generateMessageIdMock).toHaveBeenCalled();
      expect(mockServerResponse.write).toHaveBeenCalledWith(
        `f:{"messageId":"${mockMessageId}"}\n`,
      );

      expect(appendMessagesToChatHistoryContextMock).toHaveBeenCalledWith(
        mockChatId,
        [mockNewMessage],
      );

      expect(getMCPToolsContextMock).toHaveBeenCalledWith(
        mockApp,
        mockProjectId,
        mockAuthToken,
        mockAiConfig,
        expect.any(Array),
        mockLanguageModel,
      );

      expect(sendAiChatMessageSendEvent).toHaveBeenCalledWith({
        projectId: mockProjectId,
        userId: mockUserId,
        chatId: mockChatId,
        provider: mockAiConfig.provider,
      });

      expect(streamAIResponseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          chatId: mockChatId,
          projectId: mockProjectId,
          aiConfig: mockAiConfig,
          systemPrompt: mockSystemPrompt,
          languageModel: mockLanguageModel,
          serverResponse: mockServerResponse,
          tools: mockFilteredTools,
          chatHistory: expect.any(Array),
          newMessages: expect.any(Array),
        }),
      );

      expect(appendMessagesToChatHistoryMock).toHaveBeenCalledWith(
        mockChatId,
        expect.arrayContaining([
          mockNewMessage,
          expect.objectContaining({ role: 'assistant' }),
        ]),
      );

      expect(saveChatHistoryContextMock).toHaveBeenCalled();

      expect(mockMcpClients[0].close).toHaveBeenCalled();
      expect(mockMcpClients[1].close).toHaveBeenCalled();

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        `d:{"finishReason":"stop"}\n`,
      );
      expect(mockServerResponse.end).toHaveBeenCalled();
    });

    it('should handle errors during streaming', async () => {
      streamAIResponseMock.mockRejectedValue(new Error('Stream error'));

      await handleUserMessage({
        userId: mockUserId,
        chatId: mockChatId,
        projectId: mockProjectId,
        serverResponse: mockServerResponse,
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
        authToken: mockAuthToken,
        app: mockApp,
        newMessage: mockNewMessage,
      });

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        `0:${JSON.stringify('Stream error')}\n`,
      );
      expect(sendAiChatFailureEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
          userId: mockUserId,
          chatId: mockChatId,
          errorMessage: 'Stream error',
          provider: mockAiConfig.provider,
          model: mockAiConfig.model,
        }),
      );

      expect(mockMcpClients[0].close).toHaveBeenCalled();
      expect(mockMcpClients[1].close).toHaveBeenCalled();

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        `d:{"finishReason":"stop"}\n`,
      );
      expect(mockServerResponse.end).toHaveBeenCalled();
    });

    it('should handle errors when closing MCP clients', async () => {
      mockMcpClients[0].close.mockRejectedValue(new Error('Close error'));

      await handleUserMessage({
        userId: mockUserId,
        chatId: mockChatId,
        projectId: mockProjectId,
        serverResponse: mockServerResponse,
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
        authToken: mockAuthToken,
        app: mockApp,
        newMessage: mockNewMessage,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to close mcp client.',
        expect.any(Error),
      );

      expect(mockServerResponse.write).toHaveBeenCalledWith(
        `d:{"finishReason":"stop"}\n`,
      );
      expect(mockServerResponse.end).toHaveBeenCalled();
    });
  });
});
