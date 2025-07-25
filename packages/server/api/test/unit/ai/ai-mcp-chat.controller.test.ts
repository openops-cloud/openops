const decryptStringMock = jest.fn().mockReturnValue('test-encrypt');

import { AiProviderEnum, PrincipalType } from '@openops/shared';
import { LanguageModel, pipeDataStreamToResponse, streamText } from 'ai';
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
import {
  getBlockSystemPrompt,
  getMcpSystemPrompt,
} from '../../../src/app/ai/chat/prompts.service';
import { selectRelevantTools } from '../../../src/app/ai/chat/tools.service';
import { getMCPTools } from '../../../src/app/ai/mcp/mcp-tools';

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
    decryptString: decryptStringMock,
  },
}));

jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: jest.fn(),
  isLLMTelemetryEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../src/app/ai/mcp/mcp-tools', () => ({
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
  getChatHistoryWithMergedTools: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/prompts.service', () => ({
  getMcpSystemPrompt: jest.fn(),
  getBlockSystemPrompt: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/tools.service', () => ({
  selectRelevantTools: jest.fn(),
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
    const emptyToolsSystemPrompt = `${systemPrompt}\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.`;
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

    const mockAllTools = {
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

      (getMcpSystemPrompt as jest.Mock).mockResolvedValue(systemPrompt);

      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
    });

    describe('messages handling', () => {
      it('should extract message content from messages array when provided', async () => {
        (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
        (selectRelevantTools as jest.Mock).mockResolvedValue(
          mockAllTools.tools,
        );

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

        expect(selectRelevantTools).toHaveBeenCalledWith({
          messages: [
            ...mockMessages,
            { role: 'user', content: 'latest message' },
          ],
          tools: mockAllTools.tools,
          languageModel: mockLanguageModel,
          aiConfig: mockAiConfig,
        });
      });

      it('should handle messages with tool role in request body', async () => {
        (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
        (selectRelevantTools as jest.Mock).mockResolvedValue(
          mockAllTools.tools,
        );

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

        expect(selectRelevantTools).toHaveBeenCalledWith({
          messages: [
            ...mockMessages,
            { role: 'user', content: 'latest message' },
          ],
          tools: mockAllTools.tools,
          languageModel: mockLanguageModel,
          aiConfig: mockAiConfig,
        });
      });

      it('should fall back to message field when messages array is not provided', async () => {
        (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
        (selectRelevantTools as jest.Mock).mockResolvedValue(
          mockAllTools.tools,
        );

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

        expect(selectRelevantTools).toHaveBeenCalledWith({
          messages: [
            ...mockMessages,
            { role: 'user', content: 'fallback message' },
          ],
          tools: mockAllTools.tools,
          languageModel: mockLanguageModel,
          aiConfig: mockAiConfig,
        });
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

        expect(mockReply.code).toHaveBeenCalledWith(400);
        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              'Messages array cannot be empty. Please provide at least one message or use the message field instead.',
          }),
        );

        expect(selectRelevantTools).not.toHaveBeenCalled();
      });

      it('should handle invalid content structure in last message', async () => {
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

        expect(selectRelevantTools).not.toHaveBeenCalled();
      });

      it('should handle messages with complex content structure', async () => {
        (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
        (selectRelevantTools as jest.Mock).mockResolvedValue(
          mockAllTools.tools,
        );

        const requestWithComplexContent = {
          ...mockRequest,
          body: {
            chatId: 'test-chat-id',
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'simple string content' }],
              },
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

        expect(selectRelevantTools).toHaveBeenCalledWith({
          messages: [
            ...mockMessages,
            { role: 'user', content: 'complex message' },
          ],
          tools: mockAllTools.tools,
          languageModel: mockLanguageModel,
          aiConfig: mockAiConfig,
        });
      });
    });

    it('should call selectRelevantTools with the correct parameters', async () => {
      (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
      (selectRelevantTools as jest.Mock).mockResolvedValue(mockAllTools.tools);

      const postHandler = handlers['/'];
      expect(postHandler).toBeDefined();

      await postHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(selectRelevantTools).toHaveBeenCalledWith({
        messages: [...mockMessages, { role: 'user', content: 'test message' }],
        tools: mockAllTools.tools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });
    });

    it('should not call tools and load only prompt', async () => {
      (getConversation as jest.Mock).mockResolvedValue({
        chatContext: {
          ...mockChatContext,
          workflowId: 'workflowId',
          blockName: 'blockName',
          stepId: 'stepId',
          actionName: 'actionName',
        },
        messages: [...mockMessages],
      });

      const postHandler = handlers['/'];
      expect(postHandler).toBeDefined();

      await postHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(getBlockSystemPrompt).toHaveBeenCalled();
      expect(getMCPTools).not.toHaveBeenCalled();
      expect(selectRelevantTools).not.toHaveBeenCalled();
    });

    it.each([
      {
        selectedTools: {
          tool1: { description: 'Tool 1', parameters: {} },
          mcp_analytics_superset: {
            description: 'Analytics tool',
            parameters: {},
            toolProvider: 'superset',
          },
          mcp_table_tool: {
            description: 'Table tool',
            parameters: {},
            toolProvider: 'tables',
          },
          openops_mcp_tool: {
            description: 'Table tool',
            parameters: {},
            toolProvider: 'openops',
          },
        },
        expected: {
          isAnalyticsLoaded: true,
          isTablesLoaded: true,
          isOpenOpsMCPEnabled: true,
          isAwsCostMcpDisabled: true,
        },
      },
      {
        selectedTools: {
          tool1: { description: 'Tool 1', parameters: {} },
          openops_mcp_tool: {
            description: 'Table tool',
            parameters: {},
            toolProvider: 'openops',
          },
        },
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: true,
          isAwsCostMcpDisabled: true,
        },
      },
      {
        selectedTools: {
          tool1: { description: 'Tool 1', parameters: {} },
          tool2: { description: 'Tool 2', parameters: {} },
        },
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
        },
      },
      {
        selectedTools: {
          tool1: { description: 'Tool 1', parameters: {} },
          mcp_analytics_superset: {
            description: 'Analytics tool',
            parameters: {},
            toolProvider: 'superset',
          },
        },
        expected: {
          isAnalyticsLoaded: true,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
        },
      },
      {
        selectedTools: {
          tool1: { description: 'Tool 1', parameters: {} },
          mcp_table_tool: {
            description: 'Table tool',
            parameters: {},
            toolProvider: 'tables',
          },
        },
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: true,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
        },
      },
    ])(
      'should handle analytics/tables/openops flags when tools are $expected.isAnalyticsLoaded/$expected.isTablesLoaded/$expected.isOpenOpsMCPEnabled',
      async ({ selectedTools, expected }) => {
        (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
        (selectRelevantTools as jest.Mock).mockResolvedValue(selectedTools);

        const postHandler = handlers['/'];
        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(getMcpSystemPrompt).toHaveBeenCalledWith(expected);
      },
    );

    it.each([
      {
        selectedTools: undefined,
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
          expectedSystemPrompt: emptyToolsSystemPrompt,
        },
      },
      {
        selectedTools: {},
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
          expectedSystemPrompt: emptyToolsSystemPrompt,
        },
      },
      {
        selectedTools: null,
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
          expectedSystemPrompt: emptyToolsSystemPrompt,
        },
      },
      {
        selectedTools: {
          tool1: { description: 'Tool 1', parameters: {} },
        },
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpDisabled: true,
          expectedSystemPrompt: systemPrompt,
        },
      },
    ])(
      'should pass filtered tools to streamText via pipeDataStreamToResponse with $selectedTools',
      async ({ selectedTools, expected }) => {
        (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);
        (selectRelevantTools as jest.Mock).mockResolvedValue(selectedTools);

        const postHandler = handlers['/'];
        await postHandler(
          mockRequest as FastifyRequest,
          mockReply as unknown as FastifyReply,
        );

        expect(getMcpSystemPrompt).toHaveBeenCalledWith({
          isAnalyticsLoaded: expected.isAnalyticsLoaded,
          isTablesLoaded: expected.isTablesLoaded,
          isOpenOpsMCPEnabled: expected.isOpenOpsMCPEnabled,
          isAwsCostMcpDisabled: expected.isAwsCostMcpDisabled,
        });
        expect(pipeDataStreamToResponse).toHaveBeenCalled();
        expect(streamText).toHaveBeenCalledWith(
          expect.objectContaining({
            tools: selectedTools ?? {},
            system: expected.expectedSystemPrompt,
          }),
        );
      },
    );

    it('should include all openops tools from the full tool set when a relevant openops tool is present in selectedTools', async () => {
      const openopsTools = {
        openops_tool1: {
          description: 'OpenOps Tool 1',
          parameters: {},
          toolProvider: 'openops',
        },
        openops_tool2: {
          description: 'OpenOps Tool 2',
          parameters: {},
          toolProvider: 'openops',
        },
        unrelated_tool: {
          description: 'Other Tool',
          parameters: {},
          toolProvider: 'tables',
        },
      };

      (getMCPTools as jest.Mock).mockResolvedValue({
        mcpClients: [],
        tools: openopsTools,
      });

      const selectedTools = {
        openops_tool1: {
          description: 'OpenOps Tool 1',
          parameters: {},
          toolProvider: 'openops',
        },
      };

      (selectRelevantTools as jest.Mock).mockResolvedValue(selectedTools);

      const postHandler = handlers['/'];
      await postHandler(
        mockRequest as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: {
            openops_tool1: openopsTools.openops_tool1,
            openops_tool2: openopsTools.openops_tool2,
          },
        }),
      );
    });
  });

  it('should include AWS cost MCP configuration hint when MCP is not available', async () => {
    const mockToolsWithoutCost = {
      mcpClients: [],
      tools: {
        tool1: { description: 'Tool 1', parameters: {} },
      },
    };

    (getConversation as jest.Mock).mockResolvedValue({
      chatContext: { chatId: 'test-chat-id' },
      messages: [{ role: 'user', content: 'previous message' }],
    });
    (getLLMConfig as jest.Mock).mockResolvedValue({
      aiConfig: {
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
      },
      languageModel: {} as LanguageModel,
    });
    (getMcpSystemPrompt as jest.Mock).mockResolvedValue('system prompt');

    (getMCPTools as jest.Mock).mockResolvedValue(mockToolsWithoutCost);
    (selectRelevantTools as jest.Mock).mockResolvedValue({
      tool1: { description: 'Tool 1', parameters: {} },
    });

    await aiMCPChatController(mockApp, {} as FastifyPluginOptions);

    const postHandler = handlers['/'];
    await postHandler(
      mockRequest as FastifyRequest,
      mockReply as unknown as FastifyReply,
    );

    expect(getMcpSystemPrompt).toHaveBeenCalledWith({
      isAnalyticsLoaded: false,
      isTablesLoaded: false,
      isOpenOpsMCPEnabled: false,
      isAwsCostMcpDisabled: true,
    });
  });
});
