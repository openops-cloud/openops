import { AiConfig, AiProviderEnum } from '@openops/shared';
import {
  CoreMessage,
  CoreUserMessage,
  generateObject,
  LanguageModel,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

const getMCPToolsMock = jest.fn();
jest.mock('../../../src/app/ai/mcp/mcp-tools', () => ({
  getMCPTools: getMCPToolsMock,
}));

const getMcpSystemPromptMock = jest.fn();
jest.mock('../../../src/app/ai/chat/prompts.service', () => ({
  getMcpSystemPrompt: getMcpSystemPromptMock,
}));

import { getMCPToolsContext } from '../../../src/app/ai/chat/tools.service';
describe('getMCPToolsContext', () => {
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

  const mockMessages: CoreMessage[] = [
    { role: 'user', content: 'Test message' } as CoreUserMessage,
  ];

  const mockApp = {
    swagger: jest.fn(),
  } as unknown as FastifyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should return empty objects with no tools available message', async () => {
      getMcpSystemPromptMock.mockResolvedValue('');
      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: {},
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(result).toStrictEqual({
        mcpClients: [],
        filteredTools: {},
        systemPrompt:
          '\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.',
      });
      expect(generateObject).not.toHaveBeenCalled();
    });

    it('should handle tools with no descriptions', async () => {
      const mockTools: ToolSet = {
        tool1: {
          parameters: {},
        },
        tool2: {
          description: 'Tool 2 description',
          parameters: {},
        },
      };

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'tool2'],
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(result.filteredTools).toEqual(mockTools);
      expect(generateObject).toHaveBeenCalled();
    });
  });

  describe('LLM response handling', () => {
    it('should return an empty object when LLM returns no matching tools', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
        tool2: {
          description: 'Tool 2 description',
          parameters: {},
        },
      };

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: [],
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(result.filteredTools).toEqual({});
      expect(generateObject).toHaveBeenCalled();
    });

    it('should filter out tools not in the original list', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
        tool2: {
          description: 'Tool 2 description',
          parameters: {},
        },
      };

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'nonexistent_tool'],
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(result.filteredTools).toEqual({
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
      });
    });

    it('should handle when all tool names returned by the LLM are invalid', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
        tool2: {
          description: 'Tool 2 description',
          parameters: {},
        },
      };

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['invalid1', 'invalid2'],
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(result.filteredTools).toEqual({});
    });

    it('should properly handle a mix of valid and invalid tool names', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
        tool2: {
          description: 'Tool 2 description',
          parameters: {},
        },
        tool3: {
          description: 'Tool 3 description',
          parameters: {},
        },
      };

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1', 'invalid_tool', 'tool3'],
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(result.filteredTools).toEqual({
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
        tool3: {
          description: 'Tool 3 description',
          parameters: {},
        },
      });
    });
  });

  describe('Tool limits', () => {
    it('should limit the number of tools to MAX_SELECTED_TOOLS', async () => {
      const mockTools: ToolSet = {};
      for (let i = 1; i <= 150; i++) {
        mockTools[`tool${i}`] = {
          description: `Tool ${i} description`,
          parameters: {},
        };
      }

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: Object.keys(mockTools),
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        mockMessages,
        mockLanguageModel,
      );

      expect(Object.keys(result.filteredTools || {}).length).toBe(128);
    });
  });

  describe('Message handling', () => {
    it('should work with different message formats', async () => {
      const mockTools: ToolSet = {
        tool1: {
          description: 'Tool 1 description',
          parameters: {},
        },
      };

      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });

      const complexMessages: CoreMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message 1' } as CoreUserMessage,
        { role: 'assistant', content: 'Assistant message' },
        { role: 'user', content: 'User message 2' } as CoreUserMessage,
      ];

      (generateObject as jest.Mock).mockResolvedValue({
        object: {
          tool_names: ['tool1'],
        },
      });

      const result = await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        mockAiConfig,
        complexMessages,
        mockLanguageModel,
      );

      expect(result.filteredTools).toEqual(mockTools);
      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: complexMessages,
        }),
      );
    });
  });

  describe('Configuration', () => {
    it('should pass correct model settings from aiConfig to generateObject', async () => {
      getMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: {
          tool1: {
            description: 'Tool 1 description',
            parameters: {},
          },
        },
      });

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
        },
      });

      await getMCPToolsContext(
        mockApp,
        'projectId',
        'authToken',
        aiConfigWithSettings,
        mockMessages,
        mockLanguageModel,
      );

      expect(generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          topP: 0.95,
        }),
      );
    });
  });
});
