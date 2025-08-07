import { AiProviderEnum, PrincipalType } from '@openops/shared';
import { LanguageModel } from 'ai';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  generateChatName,
  getAllChats,
  getConversation,
  getLLMConfig,
  updateChatName,
} from '../../../src/app/ai/chat/ai-chat.service';

const routeChatRequestMock = jest.fn();
jest.mock('../../../src/app/ai/chat/chat-request-router', () => ({
  routeChatRequest: routeChatRequestMock,
}));

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
}));

import { aiMCPChatController } from '../../../src/app/ai/chat/ai-mcp-chat.controller';

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

    it('should extract message content from messages array when provided', async () => {
      const requestWithMessages = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          messages: [
            {
              role: 'user',
              parts: [{ type: 'text', text: 'first message' }],
            },
            {
              role: 'assistant',
              parts: [{ type: 'text', text: 'assistant response' }],
            },
            {
              role: 'user',
              parts: [{ type: 'text', text: 'latest message' }],
            },
          ],
        },
      };

      const postHandler = handlers['/'];
      await postHandler(
        requestWithMessages as FastifyRequest,
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

    it('should handle messages with tool role in request body', async () => {
      const requestWithToolMessages = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          messages: [
            {
              role: 'user',
              parts: [{ type: 'text', text: 'user question' }],
            },
            {
              role: 'assistant',
              parts: [
                {
                  type: 'tool-call',
                  toolCallId: 'call_123',
                  name: 'get_weather',
                  args: {},
                },
              ],
            },
            {
              role: 'tool',
              parts: [
                {
                  type: 'tool-result',
                  toolCallId: 'call_123',
                  result: { temperature: 72 },
                },
              ],
            },
            {
              role: 'user',
              parts: [{ type: 'text', text: 'latest message' }],
            },
          ],
        },
      };

      const postHandler = handlers['/'];
      await postHandler(
        requestWithToolMessages as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(routeChatRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: { role: 'user', content: 'latest message' },
        }),
      );
    });

    it('should fall back to message field when messages array is not provided', async () => {
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

    it('should handle empty messages array gracefully', async () => {
      const requestWithEmptyMessages = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          messages: [],
        },
      };

      const postHandler = handlers['/'];

      await postHandler(
        requestWithEmptyMessages as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      if (routeChatRequestMock.mock.calls.length === 0) {
        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              'Messages array cannot be empty. Please provide at least one message or use the message field instead.',
          }),
        );
      } else {
        expect(routeChatRequestMock).toHaveBeenCalledWith(
          expect.objectContaining({
            newMessage: { role: 'user', content: 'latest message' },
          }),
        );
      }
    });

    it('should handle invalid content structure in last message', async () => {
      const requestWithInvalidContent = {
        ...mockRequest,
        body: {
          chatId: 'test-chat-id',
          messages: [
            {
              role: 'user',
              parts: [{ type: 'text', text: 'valid message' }],
            },
            { role: 'user', parts: [] },
          ],
        },
      };

      const postHandler = handlers['/'];

      await postHandler(
        requestWithInvalidContent as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'Last message must have valid content array with at least one element.',
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
    });

    it('should return "New Chat" for empty messages', async () => {
      (getConversation as jest.Mock).mockResolvedValue({ chatHistory: [] });

      await postHandler(
        { ...mockRequest, body: { chatId: 'test-chat-id' } } as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({ chatName: 'New Chat' });
    });

    it('should return "New Chat" if LLM returns empty', async () => {
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
      expect(mockReply.send).toHaveBeenCalledWith({ chatName: 'New Chat' });
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
      const postHandler = handlers['/chat-name'];
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
});
