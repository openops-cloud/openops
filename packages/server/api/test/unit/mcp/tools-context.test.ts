import { AiConfigParsed, AiProviderEnum } from '@openops/shared';
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

const getChatToolsMock = jest.fn();
const saveChatToolsMock = jest.fn();
jest.mock('../../../src/app/ai/chat/ai-chat.service', () => ({
  getChatTools: getChatToolsMock,
  saveChatTools: saveChatToolsMock,
}));

import { getMCPToolsContext } from '../../../src/app/ai/mcp/tools-context-builder';

describe('getMCPToolsContext', () => {
  const mockLanguageModel = {} as LanguageModel;
  const mockAiConfig = {
    provider: AiProviderEnum.ANTHROPIC,
    model: 'claude-3-sonnet',
    apiKey: 'test-api-key',
    enabled: true,
    providerSettings: {},
    modelSettings: {},
  } as AiConfigParsed;

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

    expect(getMcpSystemPromptMock).toHaveBeenCalledWith({
      queryClassification: ['general'],
      selectedTools: {},
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

  describe('Abort signal', () => {
    it('should abort the LLM call when the abort signal is triggered', async () => {
      const abortSignal = new AbortController().signal;
      await getMCPToolsContext({
        app: mockApp,
        projectId: 'projectId',
        authToken: 'authToken',
        aiConfig: mockAiConfig,
        messages: mockMessages,
        chatContext: mockChatContext,
        languageModel: mockLanguageModel,
        frontendTools: {},
        abortSignal,
      });

      expect(routeQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal,
        }),
      );
    });
  });

  describe('Append-only tool tracking', () => {
    const mockTools: ToolSet = {
      tool1: { description: 'Tool 1' },
      tool2: { description: 'Tool 2' },
      tool3: { description: 'Tool 3' },
    };

    beforeEach(() => {
      startMCPToolsMock.mockResolvedValue({
        mcpClients: [],
        tools: mockTools,
      });
      getMcpSystemPromptMock.mockResolvedValue('System prompt');
      getChatToolsMock.mockResolvedValue([]);
      saveChatToolsMock.mockResolvedValue(undefined);
    });

    it.each([
      {
        description:
          'should save new tools to Redis when userId and chatId are provided',
        previousTools: [],
        filteredTools: { tool1: mockTools.tool1 },
        expectedSavedTools: ['tool1'],
      },
      {
        description: 'should merge previous tools with new tools (append-only)',
        previousTools: ['tool1'],
        filteredTools: { tool2: mockTools.tool2 },
        expectedSavedTools: expect.arrayContaining(['tool1', 'tool2']),
      },
      {
        description: 'should deduplicate tools in the final list',
        previousTools: ['tool1', 'tool2'],
        filteredTools: {
          tool1: mockTools.tool1,
          tool2: mockTools.tool2,
          tool3: mockTools.tool3,
        },
        expectedSavedTools: expect.arrayContaining(['tool1', 'tool2', 'tool3']),
      },
    ])(
      '$description',
      async ({ previousTools, filteredTools, expectedSavedTools }) => {
        getChatToolsMock.mockResolvedValue(previousTools);
        routeQueryMock.mockResolvedValue({
          tools: filteredTools,
          queryClassification: ['general'],
        });

        await getMCPToolsContext({
          app: mockApp,
          projectId: 'test-project',
          authToken: 'authToken',
          aiConfig: mockAiConfig,
          messages: mockMessages,
          chatContext: {},
          languageModel: mockLanguageModel,
          frontendTools: {},
          userId: 'test-user',
          chatId: 'test-chat',
        });

        expect(getChatToolsMock).toHaveBeenCalledWith(
          'test-chat',
          'test-user',
          'test-project',
        );
        expect(saveChatToolsMock).toHaveBeenCalledWith(
          'test-chat',
          'test-user',
          'test-project',
          expectedSavedTools,
        );
      },
    );

    it('should pass userId, chatId, and projectId to routeQuery', async () => {
      routeQueryMock.mockResolvedValue({
        tools: { tool3: mockTools.tool3 },
        queryClassification: ['general'],
        selectedToolNames: ['tool3'],
      });

      await getMCPToolsContext({
        app: mockApp,
        projectId: 'test-project',
        authToken: 'authToken',
        aiConfig: mockAiConfig,
        messages: mockMessages,
        chatContext: {},
        languageModel: mockLanguageModel,
        frontendTools: {},
        userId: 'test-user',
        chatId: 'test-chat',
      });

      expect(routeQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          chatId: 'test-chat',
          projectId: 'test-project',
        }),
      );
    });

    it('should use selectedToolNames from routeQuery', async () => {
      routeQueryMock.mockResolvedValue({
        tools: { tool2: mockTools.tool2 },
        queryClassification: ['general'],
        selectedToolNames: ['tool1', 'tool2'], // routeQuery handles append-only merge
      });

      await getMCPToolsContext({
        app: mockApp,
        projectId: 'test-project',
        authToken: 'authToken',
        aiConfig: mockAiConfig,
        messages: mockMessages,
        chatContext: {},
        languageModel: mockLanguageModel,
        frontendTools: {},
        userId: 'test-user',
        chatId: 'test-chat',
      });

      const savedTools = saveChatToolsMock.mock.calls[0][3];
      expect(savedTools).toEqual(['tool1', 'tool2']);
    });

    it.each([
      {
        description: 'missing userId',
        userId: undefined,
        chatId: 'test-chat',
      },
      {
        description: 'missing chatId',
        userId: 'test-user',
        chatId: undefined,
      },
      {
        description: 'missing both userId and chatId',
        userId: undefined,
        chatId: undefined,
      },
    ])(
      'should not call Redis functions when $description',
      async ({ userId, chatId }) => {
        routeQueryMock.mockResolvedValue({
          tools: { tool1: mockTools.tool1 },
          queryClassification: ['general'],
        });

        await getMCPToolsContext({
          app: mockApp,
          projectId: 'test-project',
          authToken: 'authToken',
          aiConfig: mockAiConfig,
          messages: mockMessages,
          chatContext: {},
          languageModel: mockLanguageModel,
          frontendTools: {},
          userId,
          chatId,
        });

        expect(getChatToolsMock).not.toHaveBeenCalled();
        expect(saveChatToolsMock).not.toHaveBeenCalled();
      },
    );
  });
});
