import { logger } from '@openops/server-shared';
import {
  AiConfig,
  AiProviderEnum,
  CODE_BLOCK_NAME,
  Principal,
} from '@openops/shared';
import { CoreMessage, LanguageModel } from 'ai';
import { FastifyInstance, FastifyReply } from 'fastify';
import { IncomingMessage, ServerResponse } from 'node:http';
import { routeChatRequest } from '../../../src/app/ai/chat/chat-request-router';

jest.mock('@openops/server-shared', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  getConversation: jest.fn(),
  getLLMConfig: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/code-generation-handler', () => ({
  handleCodeGenerationRequest: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/user-message-handler', () => ({
  handleUserMessage: jest.fn(),
}));

jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendAiChatMessageSendEvent: jest.fn(),
}));

describe('Chat Request Router', () => {
  const { getConversation, getLLMConfig } = jest.requireMock(
    '../../../src/app/ai/chat/ai-chat.service',
  );
  const { handleCodeGenerationRequest } = jest.requireMock(
    '../../../src/app/ai/chat/code-generation-handler',
  );
  const { handleUserMessage } = jest.requireMock(
    '../../../src/app/ai/chat/user-message-handler',
  );
  const { sendAiChatMessageSendEvent } = jest.requireMock(
    '../../../src/app/telemetry/event-models',
  );

  const mockServerResponse = {
    write: jest.fn(),
    end: jest.fn(),
    writeHead: jest.fn(),
    on: jest.fn(),
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

  const mockPrincipal: Principal = {
    id: 'test-user-id',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: 'USER' as any,
    projectId: 'test-project-id',
    organization: {
      id: 'test-org-id',
    },
  };

  const mockNewMessage: CoreMessage = {
    role: 'user',
    content: 'How are you?',
  };

  const mockRaw = {
    aborted: false,
  } as unknown as IncomingMessage;

  const mockRequest = {
    body: {
      chatId: 'test-chat-id',
      message: 'How are you?',
      additionalContext: undefined,
    },
    principal: mockPrincipal,
    headers: {
      authorization: 'Bearer test-auth-token',
    },
    raw: mockRaw,
  };

  const mockChatHistory: CoreMessage[] = [
    {
      role: 'user',
      content: 'Hello',
    },
  ];

  const mockReply = {
    hijack: jest.fn(),
    raw: mockServerResponse,
  } as unknown as FastifyReply;

  const mockParams = {
    app: mockApp,
    request: mockRequest,
    newMessage: mockNewMessage,
    reply: mockReply,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('routeChatRequest', () => {
    it('should route to code generation when blockName is CODE_BLOCK_NAME', async () => {
      getConversation.mockResolvedValue({
        chatContext: { blockName: CODE_BLOCK_NAME },
        chatHistory: [...mockChatHistory],
      });

      getLLMConfig.mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      handleCodeGenerationRequest.mockResolvedValue(undefined);

      await routeChatRequest(mockParams);

      expect(logger.debug).toHaveBeenCalledWith('Using code generation flow');
      expect(handleCodeGenerationRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          app: mockApp,
          authToken: 'test-auth-token',
          chatId: 'test-chat-id',
          userId: 'test-user-id',
          projectId: 'test-project-id',
          newMessage: mockNewMessage,
          serverResponse: mockServerResponse,
          conversation: {
            chatContext: { blockName: CODE_BLOCK_NAME },
            chatHistory: expect.arrayContaining([
              ...mockChatHistory,
              mockNewMessage,
            ]),
          },
          aiConfig: mockAiConfig,
          languageModel: mockLanguageModel,
          additionalContext: undefined,
          abortSignal: expect.any(AbortSignal),
        }),
      );
    });

    it('should route to normal conversation when blockName is not CODE_BLOCK_NAME', async () => {
      getConversation.mockResolvedValue({
        chatContext: { blockName: 'some-other-block' },
        chatHistory: [...mockChatHistory],
      });

      getLLMConfig.mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      handleUserMessage.mockResolvedValue(undefined);

      await routeChatRequest(mockParams);

      expect(logger.debug).toHaveBeenCalledWith(
        'Using normal conversation flow',
      );
      expect(handleUserMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          app: mockApp,
          authToken: 'test-auth-token',
          chatId: 'test-chat-id',
          userId: 'test-user-id',
          projectId: 'test-project-id',
          newMessage: mockNewMessage,
          serverResponse: mockServerResponse,
          conversation: {
            chatContext: { blockName: 'some-other-block' },
            chatHistory: expect.arrayContaining([
              ...mockChatHistory,
              mockNewMessage,
            ]),
          },
          aiConfig: mockAiConfig,
          languageModel: mockLanguageModel,
          additionalContext: undefined,
          abortSignal: expect.any(AbortSignal),
        }),
      );
    });

    it('should route to normal conversation when chatContext is undefined', async () => {
      getConversation.mockResolvedValue({
        chatContext: undefined,
        chatHistory: [...mockChatHistory],
      });

      getLLMConfig.mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      handleUserMessage.mockResolvedValue(undefined);

      await routeChatRequest(mockParams);

      expect(logger.debug).toHaveBeenCalledWith(
        'Using normal conversation flow',
      );
      expect(handleUserMessage).toHaveBeenCalled();
    });

    it('should send telemetry event with correct parameters', async () => {
      getConversation.mockResolvedValue({
        chatContext: { blockName: 'some-other-block' },
        chatHistory: [...mockChatHistory],
      });

      getLLMConfig.mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      handleUserMessage.mockResolvedValue(undefined);

      await routeChatRequest(mockParams);

      expect(sendAiChatMessageSendEvent).toHaveBeenCalledWith({
        projectId: 'test-project-id',
        userId: 'test-user-id',
        chatId: 'test-chat-id',
        provider: AiProviderEnum.ANTHROPIC,
      });
    });

    it('should handle missing authorization header', async () => {
      const paramsWithoutAuth = {
        ...mockParams,
        request: {
          ...mockRequest,
          headers: {},
        },
      };

      getConversation.mockResolvedValue({
        chatContext: { blockName: 'some-other-block' },
        chatHistory: [...mockChatHistory],
      });

      getLLMConfig.mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      handleUserMessage.mockResolvedValue(undefined);

      await routeChatRequest(paramsWithoutAuth);

      expect(handleUserMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: '',
        }),
      );
    });

    it('should add newMessage to chat history', async () => {
      getConversation.mockResolvedValue({
        chatContext: { blockName: 'some-other-block' },
        chatHistory: [...mockChatHistory],
      });

      getLLMConfig.mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      handleUserMessage.mockResolvedValue(undefined);

      await routeChatRequest(mockParams);

      expect(handleUserMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation: {
            chatContext: { blockName: 'some-other-block' },
            chatHistory: expect.arrayContaining([
              ...mockChatHistory,
              mockNewMessage,
            ]),
          },
        }),
      );
    });
  });
});
