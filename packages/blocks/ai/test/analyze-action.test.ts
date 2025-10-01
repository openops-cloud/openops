jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: jest.fn(),
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import { AiProviderEnum, analysisLLMSchema } from '@openops/shared';
import { generateObject } from 'ai';
import { analyze } from '../src/lib/actions/analyze';

describe('analyze action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should expose correct props', () => {
    expect(analyze.props).toMatchObject({
      prompt: {
        type: 'LONG_TEXT',
        displayName: 'Prompt',
        required: true,
      },
      sources: {
        type: 'ARRAY',
        displayName: 'Sources',
        required: false,
      },
    });
  });

  test('should call generateObject with prompt only when sources are not provided', async () => {
    const { getAiProviderLanguageModel } = jest.requireMock(
      '@openops/common',
    ) as { getAiProviderLanguageModel: jest.Mock };
    getAiProviderLanguageModel.mockResolvedValue('languageModel');
    (generateObject as jest.Mock).mockResolvedValue({
      object: { textAnswer: 'answer', classifications: [] },
    });

    const auth = {
      providerModel: { provider: AiProviderEnum.OPENAI, model: 'gpt-test' },
      apiKey: 'k',
      providerSettings: { someProviderSetting: true },
      modelSettings: { maxRetries: 2 },
    };

    const context = createContext(auth, { prompt: 'Hello' });

    const result = await analyze.run(context as any);

    expect(generateObject).toHaveBeenCalledWith({
      model: 'languageModel',
      prompt: 'Hello',
      schema: analysisLLMSchema,
      maxRetries: 2,
    });

    expect(result).toEqual({ textAnswer: 'answer', classifications: [] });
  });

  test('should include sources in composed prompt and pass baseURL in providerSettings', async () => {
    const { getAiProviderLanguageModel } = jest.requireMock(
      '@openops/common',
    ) as { getAiProviderLanguageModel: jest.Mock };
    getAiProviderLanguageModel.mockResolvedValue('languageModel');
    (generateObject as jest.Mock).mockResolvedValue({
      object: {
        textAnswer: 'final',
        classifications: [{ name: 'x', reason: 'y' }],
      },
    });

    const auth = {
      providerModel: { provider: AiProviderEnum.OPENAI, model: 'gpt-4' },
      apiKey: 'secret',
      baseURL: 'http://llm.local',
      providerSettings: { region: 'us' },
      modelSettings: { temperature: 0.3 },
    };

    const context = createContext(auth, {
      prompt: 'Analyze this',
      sources: ['s1', 's2'],
    });

    const result = await analyze.run(context as any);

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'languageModel',
        prompt: 'Analyze this\n\nSources:\ns1,s2',
        schema: analysisLLMSchema,
        temperature: 0.3,
      }),
    );

    expect(result).toEqual({
      textAnswer: 'final',
      classifications: [{ name: 'x', reason: 'y' }],
    });
  });
});

function createContext(auth?: unknown, props?: unknown): unknown {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: props,
  };
}
