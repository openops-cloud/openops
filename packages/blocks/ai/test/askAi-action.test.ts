jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: jest.fn(),
  getAiModelFromConnection: jest.fn(
    (model: string, customModel?: string) => customModel || model,
  ),
}));

jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import { getAiProviderLanguageModel } from '@openops/common';
import { AiProviderEnum, analysisLLMSchema } from '@openops/shared';
import { generateObject } from 'ai';
import { askAi } from '../src/lib/actions/askAi';

describe('analyze action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should expose correct props', () => {
    expect(askAi.props).toMatchObject({
      prompt: {
        type: 'LONG_TEXT',
        displayName: 'Prompt',
        required: true,
      },
      additionalInput: {
        type: 'ARRAY',
        displayName: 'Additional input',
        required: false,
      },
    });
  });

  test('should call generateObject with prompt only when additionalInput is not provided', async () => {
    (getAiProviderLanguageModel as jest.Mock).mockResolvedValue(
      'languageModel',
    );
    (generateObject as jest.Mock).mockResolvedValue({
      object: { textAnswer: 'answer', classifications: [] },
    });

    const auth = {
      provider: AiProviderEnum.OPENAI,
      model: 'gpt-test',
      apiKey: 'k',
      providerSettings: { someProviderSetting: true },
      modelSettings: { maxRetries: 2 },
    };

    const context = createContext(auth, { prompt: 'Hello' });

    const result = await askAi.run(context as any);

    expect(generateObject).toHaveBeenCalledWith({
      model: 'languageModel',
      prompt: 'Hello',
      schema: analysisLLMSchema,
      maxRetries: 2,
    });

    expect(result).toEqual({ textAnswer: 'answer', classifications: [] });
  });

  test('should include additional input in composed prompt and pass baseURL in providerSettings', async () => {
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
      provider: AiProviderEnum.OPENAI,
      model: 'gpt-4',
      apiKey: 'secret',
      baseURL: 'http://llm.local',
      providerSettings: { region: 'us' },
      modelSettings: { temperature: 0.3 },
    };

    const context = createContext(auth, {
      prompt: 'Analyze this',
      additionalInput: ['s1', 's2'],
    });

    const result = await askAi.run(context as any);

    expect(generateObject).toHaveBeenCalledTimes(1);
    const args = (generateObject as jest.Mock).mock.calls[0][0];
    expect(args.model).toBe('languageModel');
    expect(args.prompt).toMatch(
      /Analyze this\s*\nAdditional Input:\n"s1","s2"/,
    );
    expect(args.schema).toBeDefined();
    expect(args.temperature).toBe(0.3);

    expect(result).toEqual({
      textAnswer: 'final',
      classifications: [{ name: 'x', reason: 'y' }],
    });
  });
  test('should use customModel when provided', async () => {
    (getAiProviderLanguageModel as jest.Mock).mockResolvedValue('lm');
    (generateObject as jest.Mock).mockResolvedValue({ object: 'ok' });

    const auth = {
      provider: AiProviderEnum.OPENAI,
      model: 'CUSTOM',
      customModel: 'gpt-4o-mini',
      apiKey: 'sk',
      providerSettings: {},
      modelSettings: {},
    };

    const context = createContext(auth, { prompt: 'Hi' });

    const result = await askAi.run(context as any);

    expect(getAiProviderLanguageModel).toHaveBeenCalledWith({
      provider: AiProviderEnum.OPENAI,
      apiKey: 'sk',
      model: 'gpt-4o-mini',
      providerSettings: {},
    });

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'lm',
        prompt: 'Hi',
        schema: expect.anything(),
      }),
    );

    expect(result).toBe('ok');
  });
});

function createContext(auth?: unknown, props?: unknown): unknown {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: props,
  };
}
