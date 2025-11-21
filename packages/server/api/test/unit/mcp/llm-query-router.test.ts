import { logger } from '@openops/server-shared';
import { AiConfigParsed, AiProviderEnum } from '@openops/shared';
import {
  generateObject,
  LanguageModel,
  ModelMessage,
  ToolSet,
  UserModelMessage,
} from 'ai';

import { getChatTools } from '../../../src/app/ai/chat/ai-chat.service';
import { routeQuery } from '../../../src/app/ai/mcp/llm-query-router';

type MockTool = {
  description?: string;
  toolProvider?: string;
};

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

jest.mock('@openops/common', () => ({
  isLLMTelemetryEnabled: jest.fn().mockReturnValue(false),
  getTableNames: jest.fn().mockResolvedValue(['table1', 'table2', 'table3']),
  getDatabaseTableNames: jest
    .fn()
    .mockResolvedValue(['table1', 'table2', 'table3']),
}));

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
  system: {
    get: jest.fn().mockReturnValue('mock-value'),
    getBoolean: jest.fn().mockReturnValue(false),
  },
  AppSystemProp: {
    DB_TYPE: 'DB_TYPE',
    ENABLE_TABLES_DATABASE_TOKEN: 'ENABLE_TABLES_DATABASE_TOKEN',
  },
}));

jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  getChatTools: jest.fn(),
}));

jest.mock('../../../src/app/project/project-service', () => ({
  projectService: {
    getOneOrThrow: jest.fn().mockResolvedValue({
      tablesDatabaseId: 1,
      tablesDatabaseToken: 'mock-encrypted-token',
    }),
  },
}));

const getChatToolsMock = getChatTools as jest.Mock;

describe('selectToolsAndQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getChatToolsMock.mockResolvedValue([]);
  });
  const mockLanguageModel = {} as LanguageModel;
  const mockAiConfig = {
    provider: AiProviderEnum.ANTHROPIC,
    model: 'claude-3-sonnet',
    apiKey: 'test-api-key',
    enabled: true,
    providerSettings: {},
    modelSettings: {},
  } as AiConfigParsed;

  const mockMessages: ModelMessage[] = [
    { role: 'user', content: 'Test message' } as UserModelMessage,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should return general classification when no tools are provided', async () => {
      const emptyTools: ToolSet = {};

      const result = await routeQuery({
        messages: mockMessages,
        tools: emptyTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: undefined,
        queryClassification: ['general'],
        reasoning: undefined,
        selectedToolNames: [],
      });
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('should handle tools with no descriptions', async () => {
      const mockTools: ToolSet = {
        tool1: {},
        tool2: {
          description: 'Tool 2 description',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'tool2'],
          query_classification: ['general'],
          user_facing_reasoning: 'test reasoning',
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: mockTools,
        queryClassification: ['general'],
        reasoning: 'test reasoning',
        selectedToolNames: ['tool1', 'tool2'],
      });
      expect(generateObject).toHaveBeenCalled();
    });
  });

  describe('LLM response handling', () => {
    it('should return an empty tools object when LLM returns no matching tools', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
        tool2: {
          description: 'Tool 2 description',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: [],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: {},
        queryClassification: ['general'],
        reasoning: undefined,
        selectedToolNames: [],
      });
      expect(generateObject).toHaveBeenCalled();
    });

    it('should filter out tools not in the original list', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
        tool2: {
          description: 'Tool 2 description',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'nonexistent_tool'],
          query_classification: ['general'],
          user_facing_reasoning: 'test reasoning',
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: {
          tool1: {
            description: 'Tool 1 description',
          },
        },
        queryClassification: ['general'],
        reasoning: 'test reasoning',
        selectedToolNames: ['tool1'],
      });
    });

    it('should handle when all tool names returned by the LLM are invalid', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
        tool2: {
          description: 'Tool 2 description',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['invalid1', 'invalid2'],
          query_classification: ['general'],
          user_facing_reasoning: 'test reasoning',
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: {},
        queryClassification: ['general'],
        reasoning: 'test reasoning',
        selectedToolNames: [],
      });
    });

    it('should properly handle a mix of valid and invalid tool names', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
        tool2: {
          description: 'Tool 2 description',
        },
        tool3: {
          description: 'Tool 3 description',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'invalid_tool', 'tool3'],
          query_classification: ['general'],
          user_facing_reasoning: 'test reasoning',
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: {
          tool1: {
            description: 'Tool 1 description',
          },
          tool3: {
            description: 'Tool 3 description',
          },
        },
        queryClassification: ['general'],
        reasoning: 'test reasoning',
        selectedToolNames: ['tool1', 'tool3'],
      });
    });

    it('should return general classification when LLM throws an error', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
        tool2: {
          description: 'Tool 2 description',
        },
      };

      const mockError = new Error('LLM error');
      (generateObject as jest.Mock).mockRejectedValue(mockError);

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: undefined,
        queryClassification: ['general'],
        reasoning: undefined,
        selectedToolNames: [],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error selecting tools and query classification',
        {
          error: mockError,
        },
      );
    });
  });

  describe('Tool limits', () => {
    it('should limit the number of tools to MAX_SELECTED_TOOLS', async () => {
      const mockTools: ToolSet = {};
      for (let i = 1; i <= 150; i++) {
        mockTools[`tool${i}`] = {
          description: `Tool ${i} description`,
        };
      }

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: Object.keys(mockTools),
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(Object.keys(result?.tools || {}).length).toBe(128);
    });
  });

  describe('Message handling', () => {
    it('should work with different message formats', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
      };

      const complexMessages: ModelMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message 1' } as UserModelMessage,
        { role: 'assistant', content: 'Assistant message' },
        { role: 'user', content: 'User message 2' } as UserModelMessage,
      ];

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1'],
          query_classification: ['general'],
          user_facing_reasoning: 'test reasoning',
        },
      });

      const result = await routeQuery({
        messages: complexMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result).toEqual({
        tools: mockTools,
        queryClassification: ['general'],
        reasoning: 'test reasoning',
        selectedToolNames: ['tool1'],
      });
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: complexMessages,
        }),
      );
    });
  });

  describe('Configuration', () => {
    it('should pass correct model settings from aiConfig to generateObject', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
      };

      const aiConfigWithSettings = {
        ...mockAiConfig,
        modelSettings: {
          temperature: 0.7,
          topP: 0.95,
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1'],
          query_classification: ['general'],
        },
      });

      await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: aiConfigWithSettings,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          topP: 0.95,
        }),
      );
    });
  });

  describe('Abort signal', () => {
    it('should abort the LLM call when the abort signal is triggered', async () => {
      const abortSignal = new AbortController().signal;
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
        },
      };
      await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        abortSignal,
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal,
        }),
      );
    });
  });

  describe('Query classification', () => {
    it('should return analytics classification when LLM classifies query as analytics', async () => {
      const mockTools: Record<string, MockTool> = {
        analytics_tool: {
          description: 'Analytics tool',
          toolProvider: 'superset',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['analytics_tool'],
          query_classification: ['analytics'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools as ToolSet,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result.queryClassification).toEqual(['analytics']);
      expect(result.tools).toEqual(mockTools);
    });

    it('should return tables classification when LLM classifies query as tables', async () => {
      const mockTools: Record<string, MockTool> = {
        table_tool: {
          description: 'Table tool',
          toolProvider: 'tables',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['table_tool'],
          query_classification: ['tables'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools as ToolSet,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result.queryClassification).toEqual(['tables']);
      expect(result.tools).toEqual(mockTools);
    });

    it('should return openops classification when LLM classifies query as openops', async () => {
      const mockTools: Record<string, MockTool> = {
        openops_tool: {
          description: 'OpenOps tool',
          toolProvider: 'openops',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['openops_tool'],
          query_classification: ['openops'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools as ToolSet,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result.queryClassification).toEqual(['openops']);
      expect(result.tools).toEqual(mockTools);
    });

    it('should return aws_cost classification when LLM classifies query as aws_cost', async () => {
      const mockTools: ToolSet = {
        other_tool: {
          description: 'Other tool',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['other_tool'],
          query_classification: ['aws_cost'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result.queryClassification).toEqual(['aws_cost']);
      expect(result.tools).toEqual(mockTools);
    });

    it('should return general classification when LLM classifies query as general', async () => {
      const mockTools: ToolSet = {
        general_tool: {
          description: 'General tool',
        },
      };

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['general_tool'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        projectId: 'test-project',
        userId: 'user-123',
        chatId: 'chat-456',
      });

      expect(result.queryClassification).toEqual(['general']);
      expect(result.tools).toEqual(mockTools);
    });
  });

  describe('Append-only tool tracking', () => {
    const mockTools: ToolSet = {
      tool1: { description: 'Tool 1' },
      tool2: { description: 'Tool 2' },
      tool3: { description: 'Tool 3' },
      tool4: { description: 'Tool 4' },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should merge previous tools with newly selected tools (append-only)', async () => {
      getChatToolsMock.mockResolvedValue(['tool1', 'tool2']);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool3'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      expect(result.selectedToolNames).toEqual(
        expect.arrayContaining(['tool1', 'tool2', 'tool3']),
      );
      expect(result.selectedToolNames).toHaveLength(3);
      expect(result.tools).toEqual({
        tool1: { description: 'Tool 1' },
        tool2: { description: 'Tool 2' },
        tool3: { description: 'Tool 3' },
      });
    });

    it('should deduplicate tools when LLM selects a tool that was previously selected', async () => {
      getChatToolsMock.mockResolvedValue(['tool1', 'tool2']);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool2', 'tool3'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      expect(result.selectedToolNames).toEqual(
        expect.arrayContaining(['tool1', 'tool2', 'tool3']),
      );
      expect(result.selectedToolNames).toHaveLength(3);
    });

    it('should filter out invalid tools from previous selection', async () => {
      getChatToolsMock.mockResolvedValue(['tool1', 'invalid_tool']);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool2'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      expect(result.selectedToolNames).toEqual(
        expect.arrayContaining(['tool1', 'tool2']),
      );
      expect(result.selectedToolNames).toHaveLength(2);
      expect(result.selectedToolNames).not.toContain('invalid_tool');
    });

    it('should call getChatTools with correct parameters', async () => {
      getChatToolsMock.mockResolvedValue(['tool1']);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool2'],
          query_classification: ['general'],
        },
      });

      await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'project-789',
      });

      expect(getChatToolsMock).toHaveBeenCalledWith(
        'chat-456',
        'user-123',
        'project-789',
      );
    });

    it('should handle empty previous tools list', async () => {
      getChatToolsMock.mockResolvedValue([]);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'tool2'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      expect(result.selectedToolNames).toEqual(['tool1', 'tool2']);
    });

    it('should preserve previous tools even when LLM selects no new tools', async () => {
      getChatToolsMock.mockResolvedValue(['tool1', 'tool2']);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: [],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      // Should still have the previous tools
      expect(result.selectedToolNames).toEqual(
        expect.arrayContaining(['tool1', 'tool2']),
      );
      expect(result.selectedToolNames).toHaveLength(2);
      expect(result.tools).toEqual({
        tool1: { description: 'Tool 1' },
        tool2: { description: 'Tool 2' },
      });
    });

    it('should handle getChatTools returning null', async () => {
      getChatToolsMock.mockResolvedValue(null);

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      expect(result.selectedToolNames).toEqual(['tool1']);
    });

    it('should handle getChatTools throwing an error', async () => {
      getChatToolsMock.mockRejectedValue(new Error('Redis error'));

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1'],
          query_classification: ['general'],
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
        userId: 'user-123',
        chatId: 'chat-456',
        projectId: 'test-project',
      });

      expect(result.selectedToolNames).toEqual(['tool1']);
    });
  });
});
