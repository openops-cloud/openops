import { logger } from '@openops/server-shared';
import { AiConfig, AiProviderEnum } from '@openops/shared';
import {
  generateObject,
  LanguageModel,
  ModelMessage,
  ToolSet,
  UserModelMessage,
} from 'ai';

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
}));

describe('selectToolsAndQuery', () => {
  const mockLanguageModel = {} as LanguageModel;
  const mockAiConfig = {
    projectId: 'test-project',
    provider: AiProviderEnum.ANTHROPIC,
    model: 'claude-3-sonnet',
    apiKey: 'test-api-key',
    enabled: true,
    providerSettings: {},
    modelSettings: {},
    created: '2023-01-01',
    updated: '2023-01-01',
    id: 'test-id',
  } as AiConfig;

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
      });

      expect(result).toEqual({
        tools: undefined,
        queryClassification: ['general'],
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
          actualResult: {
            tool_names: ['tool1', 'tool2'],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });

      expect(result).toEqual({
        tools: mockTools,
        queryClassification: ['general'],
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
          actualResult: {
            tool_names: [],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });

      expect(result).toEqual({ tools: {}, queryClassification: ['general'] });
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
          actualResult: {
            tool_names: ['tool1', 'nonexistent_tool'],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });

      expect(result).toEqual({
        tools: {
          tool1: {
            description: 'Tool 1 description',
          },
        },
        queryClassification: ['general'],
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
          actualResult: {
            tool_names: ['invalid1', 'invalid2'],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });

      expect(result).toEqual({ tools: {}, queryClassification: ['general'] });
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
          actualResult: {
            tool_names: ['tool1', 'invalid_tool', 'tool3'],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
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
      });

      expect(result).toEqual({
        tools: undefined,
        queryClassification: ['general'],
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
          actualResult: {
            tool_names: Object.keys(mockTools),
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
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
          actualResult: {
            tool_names: ['tool1'],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: complexMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });

      expect(result).toEqual({
        tools: mockTools,
        queryClassification: ['general'],
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
          actualResult: {
            tool_names: ['tool1'],
            query_classification: ['general'],
          },
        },
      });

      await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: aiConfigWithSettings,
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
        abortSignal,
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
          actualResult: {
            tool_names: ['analytics_tool'],
            query_classification: ['analytics'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools as ToolSet,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
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
          actualResult: {
            tool_names: ['table_tool'],
            query_classification: ['tables'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools as ToolSet,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
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
          actualResult: {
            tool_names: ['openops_tool'],
            query_classification: ['openops'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools as ToolSet,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
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
          actualResult: {
            tool_names: ['other_tool'],
            query_classification: ['aws_cost'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
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
          actualResult: {
            tool_names: ['general_tool'],
            query_classification: ['general'],
          },
        },
      });

      const result = await routeQuery({
        messages: mockMessages,
        tools: mockTools,
        languageModel: mockLanguageModel,
        aiConfig: mockAiConfig,
      });

      expect(result.queryClassification).toEqual(['general']);
      expect(result.tools).toEqual(mockTools);
    });
  });
});
