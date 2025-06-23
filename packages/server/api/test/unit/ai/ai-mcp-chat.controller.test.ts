const decryptStringMock = jest.fn().mockReturnValue('test-encrypt');

import { getAiProviderLanguageModel } from '@openops/common';
import { AiProviderEnum, PrincipalType } from '@openops/shared';
import { LanguageModel, pipeDataStreamToResponse, streamText } from 'ai';
import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import {
  getChatContext,
  getChatHistory,
} from '../../../src/app/ai/chat/ai-chat.service';
import { aiMCPChatController } from '../../../src/app/ai/chat/ai-mcp-chat.controller';
import { getMcpSystemPrompt } from '../../../src/app/ai/chat/prompts.service';
import { selectRelevantTools } from '../../../src/app/ai/chat/tools.service';
import { aiConfigService } from '../../../src/app/ai/config/ai-config.service';
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
}));

jest.mock('../../../src/app/ai/config/ai-config.service', () => ({
  aiConfigService: {
    getActiveConfigWithApiKey: jest.fn(),
  },
}));

jest.mock('../../../src/app/ai/mcp/mcp-tools', () => ({
  getMCPTools: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  getChatContext: jest.fn(),
  getChatHistory: jest.fn(),
  saveChatHistory: jest.fn(),
  generateChatIdForMCP: jest.fn(),
  createChatContext: jest.fn(),
}));

jest.mock('../../../src/app/ai/chat/prompts.service', () => ({
  getMcpSystemPrompt: jest.fn(),
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
      isAwsCostMcpAvailable: false,
    };

    beforeEach(async () => {
      jest.clearAllMocks();

      handlers = {};

      (getChatContext as jest.Mock).mockResolvedValue(mockChatContext);
      (getChatHistory as jest.Mock).mockResolvedValue([...mockMessages]);
      (
        aiConfigService.getActiveConfigWithApiKey as jest.Mock
      ).mockResolvedValue(mockAiConfig);
      decryptStringMock.mockReturnValue('decrypted-api-key');
      (getAiProviderLanguageModel as jest.Mock).mockResolvedValue(
        mockLanguageModel,
      );
      (getMcpSystemPrompt as jest.Mock).mockResolvedValue(systemPrompt);

      await aiMCPChatController(mockApp, {} as FastifyPluginOptions);
    });

    it('should call selectRelevantTools with the correct parameters', async () => {
      (getMCPTools as jest.Mock).mockResolvedValue(mockAllTools);

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
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: false,
          expectedSystemPrompt: emptyToolsSystemPrompt,
        },
      },
      {
        selectedTools: {},
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpAvailable: false,
          expectedSystemPrompt: emptyToolsSystemPrompt,
        },
      },
      {
        selectedTools: null,
        expected: {
          isAnalyticsLoaded: false,
          isTablesLoaded: false,
          isOpenOpsMCPEnabled: false,
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: false,
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
          isAwsCostMcpAvailable: expected.isAwsCostMcpAvailable,
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
  });

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
      isAwsCostMcpAvailable: false,
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

  it('should include AWS cost MCP configuration hint when MCP is not available', async () => {
    const mockToolsWithoutCost = {
      mcpClients: [],
      tools: {
        tool1: { description: 'Tool 1', parameters: {} },
      },
      isAwsCostMcpAvailable: false,
    };

    (getMCPTools as jest.Mock).mockResolvedValue(mockToolsWithoutCost);
    (selectRelevantTools as jest.Mock).mockResolvedValue({
      tool1: { description: 'Tool 1', parameters: {} },
    });

    const postHandler = handlers['/'];
    await postHandler(
      mockRequest as FastifyRequest,
      mockReply as unknown as FastifyReply,
    );

    expect(getMcpSystemPrompt).toHaveBeenCalledWith({
      isAnalyticsLoaded: false,
      isTablesLoaded: false,
      isOpenOpsMCPEnabled: false,
      isAwsCostMcpAvailable: false,
    });
  });
});
