import { AiProviderEnum, PrincipalType } from '@openops/shared';
import { LanguageModel } from 'ai';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  createChatContext,
  deleteChatHistory,
  generateChatName,
  getAllChats,
  getChatContext,
  getConversation,
  getLLMConfig,
  updateChatName,
} from '../../../src/app/ai/chat/ai-chat.service';
import { aiMCPChatController } from '../../../src/app/ai/chat/ai-mcp-chat.controller';

jest.mock('../../../src/app/ai/chat/chat-request-router', () => ({
  routeChatRequest: jest.fn(),
}));
const { routeChatRequest: routeChatRequestMock } = jest.requireMock(
  '../../../src/app/ai/chat/chat-request-router',
) as {
  routeChatRequest: jest.Mock;
};

jest.mock('@openops/server-shared', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  system: {
    get: jest.fn((prop) => {
      if (prop === 'DB_TYPE') {
        return 'SQLITE3';
      }
      return undefined;
    }),
    getOrThrow: jest.fn((prop) => {
      if (prop === 'ENVIRONMENT') {
        return 'TESTING';
      }
      return 'mock-value';
    }),
    getNumberOrThrow: jest.fn((prop) => {
      return 10;
    }),
  },
  AppSystemProp: {
    DB_TYPE: 'DB_TYPE',
  },
  SharedSystemProp: {
    ENVIRONMENT: 'ENVIRONMENT',
    CONTAINER_TYPE: 'CONTAINER_TYPE',
  },
  DatabaseType: {
    POSTGRES: 'POSTGRES',
    SQLITE3: 'SQLITE3',
  },
  encryptUtils: {
    decryptString: jest.fn().mockReturnValue('test-encrypt'),
  },
}));

jest.mock('../../../src/app/ai/chat/context-enrichment.service', () => ({
  enrichContext: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/code.service', () => ({
  streamCode: jest.fn(),
}));

jest.mock('../../../src/app/telemetry/event-models', () => ({
  sendAiChatFailureEvent: jest.fn(),
  sendAiChatMessageSendEvent: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  getChatContext: jest.fn(),
  getChatHistory: jest.fn(),
  saveChatHistory: jest.fn(),
  generateChatIdForMCP: jest.fn(),
  generateChatId: jest.fn(),
  createChatContext: jest.fn(),
  getConversation: jest.fn(),
  getLLMConfig: jest.fn(),
  generateChatName: jest.fn(),
  updateChatName: jest.fn(),
  getAllChats: jest.fn(),
  deleteChatHistory: jest.fn(),
}));

jest.mock('@openops/common', () => ({
  validateAiProviderConfig: jest.fn(),
  getLangfuseSpanProcessor: jest.fn().mockReturnValue(undefined),
  withLangfuseSession: jest.fn((_sessionId, _userId, _input, fn) => fn()),
}));

jest.mock('@langfuse/tracing', () => ({
  observe: jest.fn((fn) => fn),
  updateActiveObservation: jest.fn(),
  updateActiveTrace: jest.fn(),
}));

const { validateAiProviderConfig: validateAiProviderConfigMock } =
  jest.requireMock('@openops/common') as {
    validateAiProviderConfig: jest.Mock;
  };

describe('AI MCP Chat Controller - Tool Service Interactions', () => {
  type RouteHandler = (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<void>;

  let handlers: Record<string, RouteHandler> = {};
  const mockApp = {
    post: jest.fn((path: string, _: unknown, handler: RouteHandler) => {
      handlers[path] = handler;
      return mockApp;
    }),
    delete: jest.fn((path: string, _: unknown, handler: RouteHandler) => {
      handlers[path] = handler;
      return mockApp;
    }),
    get: jest.fn((path: string, _: unknown, handler: RouteHandler) => {
      handlers[path] = handler;
      return mockApp;
    }),
  } as unknown as FastifyInstance;

  const mockReply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    hijack: jest.fn(),
    raw: {
      write: jest.fn(),
      end: jest.fn(),
      writeHead: jest.fn(),
      setHeader: jest.fn(),
    },
  };

  const mockRequest = {
    body: {
      chatId: 'test-chat-id',
      message: 'test message',
    },
    principal: {
      id: 'test-user-id',
      projectId: 'test-project-id',
      type: PrincipalType.USER,
    },
    params: {},
    headers: {
      authorization: 'Bearer test-token',
    },
  };

  describe('POST / (new message endpoint)', () => {
    const mockChatContext = { chatId: 'test-chat-id' };
    const mockMessages = [{ role: 'user', content: 'previous message' }];
    const mockAiConfig = {
      projectId: 'test-project-id',
      provider: AiProviderEnum.ANTHROPIC,
      model: 'claude-3-sonnet',
      apiKey: JSON.stringify('encrypted-api-key'),
      enabled: true,
      providerSettings: {},
      modelSettings: {},
      created: '2023-01-01',
      updated: '2023-01-01',
      id: 'test-id',
    };
    const mockLanguageModel = {} as LanguageModel;

    beforeEach(async () => {
      jest.clearAllMocks();

      handlers = {};

      (getConversation as jest.Mock).mockResolvedValue({
        chatContext: mockChatContext,
        messages: [...mockMessages],
      });
      (getLLMConfig as jest.Mock).mockResolvedValue({
        aiConfig: mockAiConfig,
        languageModel: mockLanguageModel,
      });

      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
    });

    it('should extract message content from UIMessage format', async () => {
      const requestWithUIMessage = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'latest message' }],
          },
        },
      };

      const postHandler = handlers['/'];
      await postHandler(
        requestWithUIMessage as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: {
            role: 'user',
            content: 'latest message',
          },
        }),
      );
    });

    it('should handle UIMessage with tool-ui parts', async () => {
      const requestWithToolUI = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          message: {
            role: 'user',
            parts: [
              { type: 'text', text: 'Use this tool' },
              { type: 'tool-ui-call', toolName: 'ui-search' },
            ],
          },
        },
      };

      const postHandler = handlers['/'];
      await postHandler(
        requestWithToolUI as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: { role: 'user', content: 'Use this tool' },
        }),
      );
    });

    it('should handle string message format', async () => {
      const requestWithMessageOnly = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          message: 'fallback message',
        },
      };

      const postHandler = handlers['/'];
      await postHandler(
        requestWithMessageOnly as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: { role: 'user', content: 'fallback message' },
        }),
      );
    });

    it('should handle empty parts array gracefully', async () => {
      const requestWithEmptyParts = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          message: {
            role: 'user',
            parts: [],
          },
        },
      };

      const postHandler = handlers['/'];

      await postHandler(
        requestWithEmptyParts as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        }),
      );
    });

    it('should handle invalid content structure in message', async () => {
      const requestWithInvalidContent = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          message: {
            role: 'user',
            parts: [{ type: 'other', data: 'no-text' }],
          },
        },
      };

      const postHandler = handlers['/'];

      await postHandler(
        requestWithInvalidContent as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
        }),
      );
    });

    it('should call handleUserMessage with the correct parameters', async () => {
      const postHandler = handlers['/'];
      expect(postHandler).toBeDefined();

      await postHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: { role: 'user', content: 'test message' },
        }),
      );
    });
  });

  describe('POST /chat-name (chat name generation)', () => {
    let postHandler: RouteHandler;

    beforeEach(async () => {
      jest.clearAllMocks();
      handlers = {};
      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
      postHandler = handlers['/chat-name'];
    });

    it('should return generated chat name for valid messages', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [
          { role: 'user', content: 'How do I optimize AWS costs?' },
          { role: 'assistant', content: 'You can use AWS Cost Explorer...' },
        ],
      });
      (generateChatName as jest.Mock).mockResolvedValue(
        'AWS Cost Optimization',
      );

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'AWS Cost Optimization',
      });
      expect(generateChatName).toHaveBeenCalledWith(
        [{ role: 'user', content: 'How do I optimize AWS costs?' }],
        'test-project-id',
      );
      expect(updateChatName).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        'AWS Cost Optimization',
      );
    });

    it('should return "New Chat" for empty chatHistory', async () => {
      (getConversation as jest.Mock).mockResolvedValue({ chatHistory: [] });

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'New Chat',
      });
      expect(generateChatName).not.toHaveBeenCalled();
      expect(updateChatName).not.toHaveBeenCalled();
    });

    it('should return "New Chat" when chatHistory has no user messages', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [
          { role: 'assistant', content: 'Some response' },
          { role: 'system', content: 'System message' },
          {
            role: 'tool',
            content: [{ type: 'tool-result', toolCallId: '123' }],
          },
        ],
      });

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'New Chat',
      });
      expect(generateChatName).not.toHaveBeenCalled();
      expect(updateChatName).not.toHaveBeenCalled();
    });

    it('should filter out invalid message objects without role property', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [
          { role: 'user', content: 'Valid message' },
          { content: 'Invalid message object' },
          { type: 'reasoning', text: 'Some reasoning' },
          { role: 'user', content: 'Another valid message' },
          { role: 'assistant', content: 'Response' },
        ],
      });
      (generateChatName as jest.Mock).mockResolvedValue('Filtered Name');

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'Filtered Name',
      });
      expect(generateChatName).toHaveBeenCalledWith(
        [
          { role: 'user', content: 'Valid message' },
          { role: 'user', content: 'Another valid message' },
        ],
        'test-project-id',
      );
    });

    it('should call generateChatName with all user messages (filtered)', async () => {
      const mockChatHistory = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Second question' },
        { role: 'assistant', content: 'Second answer' },
        { role: 'user', content: 'Third question' },
      ];

      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: mockChatHistory,
      });
      (generateChatName as jest.Mock).mockResolvedValue('Multi-Question Chat');

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(generateChatName).toHaveBeenCalledWith(
        [
          { role: 'user', content: 'First question' },
          { role: 'user', content: 'Second question' },
          { role: 'user', content: 'Third question' },
        ],
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'Multi-Question Chat',
      });
    });

    it('should return "New Chat" if LLM returns empty/whitespace', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [
          { role: 'user', content: 'Hello?' },
          { role: 'assistant', content: 'Hi!' },
        ],
      });
      (generateChatName as jest.Mock).mockResolvedValue('   ');

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'New Chat',
      });
      expect(updateChatName).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        'New Chat',
      );
    });

    it('should return "New Chat" if LLM returns empty string', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [{ role: 'user', content: 'Test question' }],
      });
      (generateChatName as jest.Mock).mockResolvedValue('');

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'New Chat',
      });
    });

    it('should persist chatName in chat context', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [
          { role: 'user', content: 'What is OpenOps?' },
          { role: 'assistant', content: 'OpenOps is a platform...' },
        ],
      });
      (generateChatName as jest.Mock).mockResolvedValue(
        'OpenOps Platform Overview',
      );

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(updateChatName).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        'OpenOps Platform Overview',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatName: 'OpenOps Platform Overview',
      });
    });

    it('should handle errors gracefully', async () => {
      (getConversation as jest.Mock).mockRejectedValue(new Error('DB error'));

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    });

    it('should handle generateChatName errors gracefully', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatHistory: [{ role: 'user', content: 'Test question' }],
      });
      (generateChatName as jest.Mock).mockRejectedValue(
        new Error('LLM API error'),
      );

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    });
  });

  describe('GET /all-chats (list all chats)', () => {
    let getHandler: RouteHandler;

    beforeEach(async () => {
      jest.clearAllMocks();
      handlers = {};
      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
      getHandler = handlers['/all-chats'];
    });

    it('should return list of chats with chatId and chatName', async () => {
      const mockChats = [
        { chatId: 'chat-1', chatName: 'AWS Cost Optimization' },
        { chatId: 'chat-2', chatName: 'Docker Container Setup' },
        { chatId: 'chat-3', chatName: 'API Design Discussion' },
      ];

      (getAllChats as jest.Mock).mockResolvedValue(mockChats);

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chats: mockChats,
      });
    });

    it('should return empty array when no chats exist', async () => {
      (getAllChats as jest.Mock).mockResolvedValue([]);

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chats: [],
      });
    });

    it('should handle large number of chats', async () => {
      const mockChats = Array.from({ length: 50 }, (_, i) => ({
        chatId: `chat-${i + 1}`,
        chatName: `Chat Session ${i + 1}`,
      }));

      (getAllChats as jest.Mock).mockResolvedValue(mockChats);

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chats: mockChats,
      });
      expect(mockChats).toHaveLength(50);
    });

    it('should handle chats with special characters in names', async () => {
      const mockChats = [
        { chatId: 'chat-1', chatName: 'AWS S3 & CloudFront Setup' },
        { chatId: 'chat-2', chatName: 'Node.js + Express.js Tutorial' },
        { chatId: 'chat-3', chatName: 'React/TypeScript Best Practices' },
        {
          chatId: 'chat-4',
          chatName: 'Database Migration (PostgreSQL → MongoDB)',
        },
      ];

      (getAllChats as jest.Mock).mockResolvedValue(mockChats);

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chats: mockChats,
      });
    });

    it('should handle service errors gracefully', async () => {
      (getAllChats as jest.Mock).mockRejectedValue(
        new Error('Cache service unavailable'),
      );

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });

    it('should handle cache timeout errors', async () => {
      (getAllChats as jest.Mock).mockRejectedValue(
        new Error('Operation timed out'),
      );

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });

    it('should call getAllChats with correct user and project parameters', async () => {
      const customRequest = {
        ...mockRequest,
        principal: {
          id: 'different-user-id',
          projectId: 'different-project-id',
          type: PrincipalType.USER,
        },
      };

      (getAllChats as jest.Mock).mockResolvedValue([]);

      await getHandler(
        customRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getAllChats).toHaveBeenCalledWith(
        'different-user-id',
        'different-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should maintain proper response structure', async () => {
      const mockChats = [{ chatId: 'test-id', chatName: 'Test Chat' }];

      (getAllChats as jest.Mock).mockResolvedValue(mockChats);

      await getHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          chats: expect.arrayContaining([
            expect.objectContaining({
              chatId: expect.any(String),
              chatName: expect.any(String),
            }),
          ]),
        }),
      );
    });
  });

  describe('POST /model (update chat model)', () => {
    let postHandler: RouteHandler;

    const mockChatContext = {
      chatId: 'test-chat-id',
      provider: AiProviderEnum.ANTHROPIC,
      model: 'claude-3-sonnet',
    };

    const mockAiConfig = {
      projectId: 'test-project-id',
      provider: AiProviderEnum.ANTHROPIC,
      model: 'claude-3-sonnet',
      apiKey: 'encrypted-api-key',
      enabled: true,
      providerSettings: {},
      modelSettings: {},
      created: '2023-01-01',
      updated: '2023-01-01',
      id: 'test-id',
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      handlers = {};
      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
      postHandler = handlers['/model'];
    });

    it('should successfully update model when validation passes', async () => {
      (getChatContext as jest.Mock).mockResolvedValue(mockChatContext);
      (getLLMConfig as jest.Mock).mockResolvedValue({
        aiConfig: mockAiConfig,
      });
      validateAiProviderConfigMock.mockResolvedValue({ valid: true });

      const requestBody = {
        chatId: 'test-chat-id',
        model: 'claude-3-opus',
      };

      await postHandler(
        {
          ...mockRequest,
          body: requestBody,
        } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(validateAiProviderConfigMock).toHaveBeenCalledWith({
        ...mockAiConfig,
        model: 'claude-3-opus',
      });
      expect(createChatContext).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        {
          ...mockChatContext,
          provider: AiProviderEnum.ANTHROPIC,
          model: 'claude-3-opus',
        },
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        chatId: 'test-chat-id',
        provider: AiProviderEnum.ANTHROPIC,
        model: 'claude-3-opus',
      });
    });

    it('should return validation error when model is not supported', async () => {
      (getChatContext as jest.Mock).mockResolvedValue(mockChatContext);
      (getLLMConfig as jest.Mock).mockResolvedValue({
        aiConfig: mockAiConfig,
      });
      validateAiProviderConfigMock.mockResolvedValue({
        valid: false,
        error: {
          errorName: 'ValidationError',
          errorMessage: 'Model not supported',
        },
      });

      const requestBody = {
        chatId: 'test-chat-id',
        model: 'invalid-model',
      };

      await postHandler(
        {
          ...mockRequest,
          body: requestBody,
        } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(validateAiProviderConfigMock).toHaveBeenCalledWith({
        ...mockAiConfig,
        model: 'invalid-model',
      });
      expect(createChatContext).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'VALIDATION' }),
      );
    });

    it('should return error when chat session is not found', async () => {
      (getChatContext as jest.Mock).mockResolvedValue(null);

      const requestBody = {
        chatId: 'non-existent-chat-id',
        model: 'claude-3-opus',
      };

      await postHandler(
        {
          ...mockRequest,
          body: requestBody,
        } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(validateAiProviderConfigMock).not.toHaveBeenCalled();
      expect(createChatContext).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ENTITY_NOT_FOUND' }),
      );
    });

    it('should use provider from context if available', async () => {
      const contextWithProvider = {
        ...mockChatContext,
        provider: AiProviderEnum.OPENAI,
      };

      (getChatContext as jest.Mock).mockResolvedValue(contextWithProvider);
      (getLLMConfig as jest.Mock).mockResolvedValue({
        aiConfig: mockAiConfig,
      });
      validateAiProviderConfigMock.mockResolvedValue({ valid: true });

      const requestBody = {
        chatId: 'test-chat-id',
        model: 'gpt-4',
      };

      await postHandler(
        {
          ...mockRequest,
          body: requestBody,
        } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(createChatContext).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        {
          ...contextWithProvider,
          provider: AiProviderEnum.OPENAI,
          model: 'gpt-4',
        },
      );
      expect(mockReply.send).toHaveBeenCalledWith({
        chatId: 'test-chat-id',
        provider: AiProviderEnum.OPENAI,
        model: 'gpt-4',
      });
    });

    it('should use provider from aiConfig when not in context', async () => {
      const contextWithoutProvider = {
        chatId: 'test-chat-id',
        model: 'claude-3-sonnet',
      };

      (getChatContext as jest.Mock).mockResolvedValue(contextWithoutProvider);
      (getLLMConfig as jest.Mock).mockResolvedValue({
        aiConfig: mockAiConfig,
      });
      validateAiProviderConfigMock.mockResolvedValue({ valid: true });

      const requestBody = {
        chatId: 'test-chat-id',
        model: 'claude-3-opus',
      };

      await postHandler(
        {
          ...mockRequest,
          body: requestBody,
        } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(createChatContext).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
        {
          ...contextWithoutProvider,
          provider: AiProviderEnum.ANTHROPIC,
          model: 'claude-3-opus',
        },
      );
    });
  });

  describe('DELETE /:chatId (delete chat)', () => {
    let deleteHandler: RouteHandler;

    beforeEach(async () => {
      jest.clearAllMocks();
      handlers = {};
      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
      deleteHandler = handlers['/:chatId'];
    });

    it('should successfully delete a chat', async () => {
      (deleteChatHistory as jest.Mock).mockResolvedValue(undefined);

      const request = {
        ...mockRequest,
        params: { chatId: 'test-chat-id' },
      } as FastifyRequest;

      await deleteHandler(request, mockReply as unknown as FastifyReply);

      expect(deleteChatHistory).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should handle deletion of non-existent chat gracefully', async () => {
      (deleteChatHistory as jest.Mock).mockResolvedValue(undefined);

      const request = {
        ...mockRequest,
        params: { chatId: 'non-existent-chat-id' },
      } as FastifyRequest;

      await deleteHandler(request, mockReply as unknown as FastifyReply);

      expect(deleteChatHistory).toHaveBeenCalledWith(
        'non-existent-chat-id',
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      (deleteChatHistory as jest.Mock).mockRejectedValue(
        new Error('Operation timed out'),
      );

      const request = {
        ...mockRequest,
        params: { chatId: 'test-chat-id' },
      } as FastifyRequest;

      await deleteHandler(request, mockReply as unknown as FastifyReply);

      expect(deleteChatHistory).toHaveBeenCalledWith(
        'test-chat-id',
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Internal server error',
      });
    });

    it('should call deleteChatHistory with correct user and project parameters', async () => {
      (deleteChatHistory as jest.Mock).mockResolvedValue(undefined);

      const customRequest = {
        ...mockRequest,
        principal: {
          id: 'different-user-id',
          projectId: 'different-project-id',
          type: PrincipalType.USER,
        },
        params: { chatId: 'custom-chat-id' },
      } as FastifyRequest;

      await deleteHandler(customRequest, mockReply as unknown as FastifyReply);

      expect(deleteChatHistory).toHaveBeenCalledWith(
        'custom-chat-id',
        'different-user-id',
        'different-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should handle chat IDs with special characters', async () => {
      (deleteChatHistory as jest.Mock).mockResolvedValue(undefined);

      const specialChatId = 'chat-id-with-special-chars-123!@#';
      const request = {
        ...mockRequest,
        params: { chatId: specialChatId },
      } as FastifyRequest;

      await deleteHandler(request, mockReply as unknown as FastifyReply);

      expect(deleteChatHistory).toHaveBeenCalledWith(
        specialChatId,
        'test-user-id',
        'test-project-id',
      );
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });
  });
});
