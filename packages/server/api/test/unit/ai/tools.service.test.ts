import { logger } from '@openops/server-shared';
import { AiConfig, AiProviderEnum } from '@openops/shared';
import {
  CoreMessage,
  CoreUserMessage,
  generateObject,
  LanguageModel,
  ToolSet,
} from 'ai';
import { selectRelevantTools } from '../../../src/app/ai/chat/tools.service';

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

describe('selectRelevantTools', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined when no tools are provided', async () => {
    const emptyTools: ToolSet = {};

    const result = await selectRelevantTools({
      messages: mockMessages,
      tools: emptyTools,
      languageModel: mockLanguageModel,
      aiConfig: mockAiConfig,
    });

    expect(result).toBeUndefined();
    expect(generateObject).not.toHaveBeenCalled();
  });

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

    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        tool_names: [],
      },
    });

    const result = await selectRelevantTools({
      messages: mockMessages,
      tools: mockTools,
      languageModel: mockLanguageModel,
      aiConfig: mockAiConfig,
    });

    expect(result).toEqual({});
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

    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        tool_names: ['tool1', 'nonexistent_tool'],
      },
    });

    const result = await selectRelevantTools({
      messages: mockMessages,
      tools: mockTools,
      languageModel: mockLanguageModel,
      aiConfig: mockAiConfig,
    });

    expect(result).toEqual({
      tool1: {
        description: 'Tool 1 description',
        parameters: {},
      },
    });
  });

  it('should return undefined when LLM throws an error', async () => {
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

    const mockError = new Error('LLM error');
    (generateObject as jest.Mock).mockRejectedValue(mockError);

    const result = await selectRelevantTools({
      messages: mockMessages,
      tools: mockTools,
      languageModel: mockLanguageModel,
      aiConfig: mockAiConfig,
    });

    expect(result).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Error selecting tools',
      mockError,
    );
  });

  it('should limit the number of tools to MAX_SELECTED_TOOLS', async () => {
    const mockTools: ToolSet = {};
    for (let i = 1; i <= 150; i++) {
      mockTools[`tool${i}`] = {
        description: `Tool ${i} description`,
        parameters: {},
      };
    }

    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        tool_names: Object.keys(mockTools),
      },
    });

    const result = await selectRelevantTools({
      messages: mockMessages,
      tools: mockTools,
      languageModel: mockLanguageModel,
      aiConfig: mockAiConfig,
    });

    expect(Object.keys(result || {}).length).toBe(128);
  });
});
