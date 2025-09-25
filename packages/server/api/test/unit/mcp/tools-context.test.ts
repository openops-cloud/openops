import { AiConfig, AiProviderEnum } from '@openops/shared';
import { LanguageModel, ModelMessage, ToolSet, UserModelMessage } from 'ai';
import { FastifyInstance } from 'fastify';

const startMCPToolsMock = jest.fn();
jest.mock('../../../src/app/ai/mcp/tools-initializer', () => ({
  startMCPTools: startMCPToolsMock,
}));

const routeQueryMock = jest.fn();
jest.mock('../../../src/app/ai/mcp/llm-query-router', () => ({
  routeQuery: routeQueryMock,
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
    routeQueryMock.mockResolvedValue({
      tools: undefined,
      queryClassification: ['general'],
    });

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
    expect(getMcpSystemPromptMock).toHaveBeenCalledWith({
      queryClassification: ['general'],
      selectedTools: undefined,
      allTools: {},
      uiContext: undefined,
    });
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

    routeQueryMock.mockResolvedValue({
      tools: mockTools,
      queryClassification: ['general'],
    });

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
    expect(getMcpSystemPromptMock).toHaveBeenCalledWith({
      queryClassification: ['general'],
      selectedTools: mockTools,
      allTools: mockTools,
      uiContext: undefined,
    });
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
});
