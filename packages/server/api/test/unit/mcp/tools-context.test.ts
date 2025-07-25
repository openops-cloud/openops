import { AiConfig, AiProviderEnum } from '@openops/shared';
import {
  CoreMessage,
  CoreUserMessage,
  LanguageModel,
  ToolSet,
} from 'ai';
import { FastifyInstance } from 'fastify';

const getMCPToolsMock = jest.fn();
jest.mock('../../../src/app/ai/mcp/tools-initializer', () => ({
  getMCPTools: getMCPToolsMock,
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

  const mockMessages: CoreMessage[] = [
    { role: 'user', content: 'Test message' } as CoreUserMessage,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty objects with no tools available message', async () => {
    getMcpSystemPromptMock.mockResolvedValue('');
    getMCPToolsMock.mockResolvedValue({
      mcpClients: [],
      tools: {},
    });
    selectRelevantToolsMock.mockResolvedValue(undefined);

    const result = await getMCPToolsContext(
      mockApp,
      'projectId',
      'authToken',
      mockAiConfig,
      mockMessages,
      mockChatContext,
      mockLanguageModel,
    );

    expect(result).toStrictEqual({
      mcpClients: [],
      filteredTools: {},
      systemPrompt:
        '\n\nMCP tools are not available in this chat. Do not claim access or simulate responses from them under any circumstance.',
    });
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

    selectRelevantToolsMock.mockResolvedValue(mockTools);

    const result = await getMCPToolsContext(
      mockApp,
      'projectId',
      'authToken',
      mockAiConfig,
      mockMessages,
      mockChatContext,
      mockLanguageModel,
    );

    expect(result.filteredTools).toEqual(mockTools);
  });

  it('should return block prompt if context is complete', async () => {
    const completeChatContext = {
      ...mockChatContext,
      workflowId: 'workflow-id',
    };

    getBlockSystemPromptMock.mockResolvedValue('System prompt');

    const result = await getMCPToolsContext(
      mockApp,
      'projectId',
      'authToken',
      mockAiConfig,
      mockMessages,
      completeChatContext,
      mockLanguageModel,
    );

    expect(result.mcpClients).toEqual([]);
    expect(result.systemPrompt).toEqual('System prompt');
  });
});
