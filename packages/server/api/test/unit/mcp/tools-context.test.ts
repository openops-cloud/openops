import { AiConfig, AiProviderEnum } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet, UserModelMessage } from 'ai';
import { FastifyInstance } from 'fastify';

const startMCPToolsMock = jest.fn();
jest.mock('../../../src/app/ai/mcp/tools-initializer', () => ({
  startMCPTools: startMCPToolsMock,
}));

const selectRelevantToolsMock = jest.fn();
jest.mock('../../../src/app/ai/mcp/tools-selector', () => ({
  selectRelevantTools: selectRelevantToolsMock,
}));

const getMcpSystemPromptMock = jest.fn();
const getBlockSystemPromptMock = jest.fn();
jest.mock('../../../src/app/ai/chat/prompts.service', () => ({
  getMcpSystemPrompt: getMcpSystemPromptMock,
  getBlockSystemPrompt: getBlockSystemPromptMock,
}));

import { getMCPToolsContext } from '../../../src/app/ai/mcp/tools-context-builder';

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

  const mockApp = {
    swagger: jest.fn(),
  } as unknown as FastifyInstance;

  const mockChatContext = {
    blockName: 'block-name',
    stepId: 'test-step-id',
    actionName: 'action-name',
  };

  const mockMessages: ModelMessage[] = [
    { role: 'user', content: 'Test message' } as UserModelMessage,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty objects with no tools available message', async () => {
    getMcpSystemPromptMock.mockResolvedValue('');
    startMCPToolsMock.mockResolvedValue({
      mcpClients: [],
      tools: {},
    });
    selectRelevantToolsMock.mockResolvedValue(undefined);

    const result = await getMCPToolsContext({
      app: mockApp,
      projectId: 'projectId',
      authToken: 'authToken',
      aiConfig: mockAiConfig,
      messages: mockMessages,
      chatContext: mockChatContext,
      languageModel: mockLanguageModel,
      frontendTools: {},
    });

    expect(result).toStrictEqual({
      mcpClients: [],
      filteredTools: {},
      systemPrompt:
        '\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.',
    });
    expect(getMcpSystemPromptMock).toHaveBeenCalled();
    expect(startMCPToolsMock).toHaveBeenCalled();
  });

  it('should handle tools with no descriptions', async () => {
    const mockTools: ToolSet = {
      tool1: {},
      tool2: {
        description: 'Tool 2 description',
      },
    };

    startMCPToolsMock.mockResolvedValue({
      mcpClients: [],
      tools: mockTools,
    });

    selectRelevantToolsMock.mockResolvedValue(mockTools);

    const result = await getMCPToolsContext({
      app: mockApp,
      projectId: 'projectId',
      authToken: 'authToken',
      aiConfig: mockAiConfig,
      messages: mockMessages,
      chatContext: mockChatContext,
      languageModel: mockLanguageModel,
      frontendTools: {},
    });

    expect(result.filteredTools).toEqual(mockTools);
    expect(getMcpSystemPromptMock).toHaveBeenCalled();
    expect(startMCPToolsMock).toHaveBeenCalled();
  });

  it('should return block prompt if context is complete', async () => {
    const completeChatContext = {
      ...mockChatContext,
      workflowId: 'workflow-id',
    };

    getBlockSystemPromptMock.mockResolvedValue('System prompt');

    const result = await getMCPToolsContext({
      app: mockApp,
      projectId: 'projectId',
      authToken: 'authToken',
      aiConfig: mockAiConfig,
      messages: mockMessages,
      chatContext: completeChatContext,
      languageModel: mockLanguageModel,
      frontendTools: {},
    });

    expect(result.mcpClients).toEqual([]);
    expect(startMCPToolsMock).not.toHaveBeenCalled();
    expect(result.systemPrompt).toEqual('System prompt');
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
    'should set correct flags based on selected tools',
    async ({ selectedTools, expected }) => {
      startMCPToolsMock.mockResolvedValue({
        tool1: {
          parameters: {},
        },
        tool2: {
          description: 'Tool 2 description',
          parameters: {},
        },
      });
      selectRelevantToolsMock.mockResolvedValue(selectedTools);

      await getMCPToolsContext({
        app: mockApp,
        projectId: 'projectId',
        authToken: 'authToken',
        aiConfig: mockAiConfig,
        messages: mockMessages,
        chatContext: mockChatContext,
        languageModel: mockLanguageModel,
        frontendTools: {},
      });

      expect(getMcpSystemPromptMock).toHaveBeenCalledWith(expected);
    },
  );
});
