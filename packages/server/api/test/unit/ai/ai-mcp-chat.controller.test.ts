import { AiProviderEnum, PrincipalType } from '@openops/shared';
import { LanguageModel } from 'ai';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  getConversation,
  getLLMConfig,
} from '../../../src/app/ai/chat/ai-chat.service';
import { aiMCPChatController } from '../../../src/app/ai/chat/ai-mcp-chat.controller';
import { getMCPToolsContext } from '../../../src/app/ai/mcp/tools-context-builder';

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

jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: jest.fn(),
  isLLMTelemetryEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../src/app/ai/mcp/tools-initializer', () => ({
  getMCPTools: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/context-enrichment.service', () => ({
  enrichContext: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/code.service', () => ({
  streamCode: jest.fn(),
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
}));

jest.mock('../../../src/app/ai/mcp/tools-context-builder', () => ({
  getMCPToolsContext: jest.fn(),
}));

type MockDataStreamWriter = {
  write: jest.Mock;
  end: jest.Mock;
};

jest.mock('ai', () => {
  const mockStreamText = jest.fn().mockReturnValue({
    mergeIntoDataStream: jest.fn(),
  });

  return {
    pipeDataStreamToResponse: jest.fn((_, options) => {
      if (options?.execute) {
        const mockWriter: MockDataStreamWriter = {
          write: jest.fn(),
          end: jest.fn(),
        };
        options.execute(mockWriter);
      }
      return { pipe: jest.fn() };
    }),
    streamText: mockStreamText,
    DataStreamWriter: jest.fn(),
    LanguageModel: jest.fn(),
  };
});

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
  } as unknown as FastifyInstance;

  const mockReply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    raw: {
      write: jest.fn(),
      end: jest.fn(),
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
    const systemPrompt = 'system prompt';
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

    const mockToolsContext = {
      systemPrompt: 'Prompt',
      mcpClients: [],
      tools: {
        tool1: { description: 'Tool 1', parameters: {} },
        tool2: { description: 'Tool 2', parameters: {} },
      },
    };

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

    describe('messages handling', () => {
      it('should extract message content from messages array when provided', async () => {
        (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

        const requestWithMessages = {
          ...mockRequest,
          body: {
            chatId: 'test-chat-id',
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'first message' }],
              },
              {
                role: 'assistant',
                content: [{ type: 'text', text: 'assistant response' }],
              },
              {
                role: 'user',
                content: [{ type: 'text', text: 'latest message' }],
              },
            ],
          },
        };

        const postHandler = handlers['/'];
        await postHandler(
          requestWithMessages as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(getMCPToolsContext).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          mockAiConfig,
          [...mockMessages, { role: 'user', content: 'latest message' }],
          expect.anything(),
          mockLanguageModel,
        );
      });

      it('should handle messages with tool role in request body', async () => {
        (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

        const requestWithToolMessages = {
          ...mockRequest,
          body: {
            chatId: 'test-chat-id',
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'user question' }],
              },
              {
                role: 'assistant',
                content: [
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
                content: [
                  {
                    type: 'tool-result',
                    toolCallId: 'call_123',
                    result: { temperature: 72 },
                  },
                ],
              },
              {
                role: 'user',
                content: [{ type: 'text', text: 'latest message' }],
              },
            ],
          },
        };

        const postHandler = handlers['/'];
        await postHandler(
          requestWithToolMessages as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(getMCPToolsContext).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          mockAiConfig,
          [...mockMessages, { role: 'user', content: 'latest message' }],
          expect.anything(),
          mockLanguageModel,
        );
      });

      it('should fall back to message field when messages array is not provided', async () => {
        (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

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

        expect(getMCPToolsContext).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          mockAiConfig,
          [...mockMessages, { role: 'user', content: 'fallback message' }],
          expect.anything(),
          mockLanguageModel,
        );
      });

      it('should handle empty messages array gracefully', async () => {
        (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

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

        if ((getMCPToolsContext as jest.Mock).mock.calls.length === 0) {
          expect(mockReply.code).toHaveBeenCalledWith(400);
          expect(mockReply.send).toHaveBeenCalledWith(
            expect.objectContaining({
              message:
                'Messages array cannot be empty. Please provide at least one message or use the message field instead.',
            }),
          );
        } else {
          expect(getMCPToolsContext).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            mockAiConfig,
            [...mockMessages, { role: 'user', content: 'latest message' }],
            expect.anything(),
            mockLanguageModel,
          );
        }
      });

      it('should handle invalid content structure in last message', async () => {
        (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

        const requestWithInvalidContent = {
          ...mockRequest,
          body: {
            chatId: 'test-chat-id',
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'valid message' }],
              },
              { role: 'user', content: [] },
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

      it('should handle messages with complex content structure', async () => {
        (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

        const requestWithComplexContent = {
          ...mockRequest,
          body: {
            chatId: 'test-chat-id',
            messages: [
              { role: 'user', content: 'simple string content' },
              {
                role: 'assistant',
                content: [{ type: 'text', text: 'assistant response' }],
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'complex message' },
                  { type: 'text', text: ' with multiple parts' },
                ],
              },
            ],
          },
        };

        const postHandler = handlers['/'];
        await postHandler(
          requestWithComplexContent as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(getMCPToolsContext).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.anything(),
          mockAiConfig,
          [...mockMessages, { role: 'user', content: 'complex message' }],
          expect.anything(),
          mockLanguageModel,
        );
      });
    });

    it('should call getMCPToolsContext with the correct parameters', async () => {
      (getMCPToolsContext as jest.Mock).mockResolvedValue(mockToolsContext);

      const postHandler = handlers['/'];
      expect(postHandler).toBeDefined();

      await postHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getMCPToolsContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        mockAiConfig,
        [...mockMessages, { role: 'user', content: 'test message' }],
        expect.anything(),
        mockLanguageModel,
      );
    });
  });
});
