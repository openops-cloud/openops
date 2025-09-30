jest.mock('@openops/common', () => ({
  getAiProviderLanguageModel: jest.fn(),
  getAiModelFromConnection: jest.fn(
    (model: string, customModel?: string) => customModel || model,
  ),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

import { getAiProviderLanguageModel } from '@openops/common';
import { AiProviderEnum } from '@openops/shared';
import { generateText } from 'ai';
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

  test('should call LLM with prompt only when sources are not provided', async () => {
    (getAiProviderLanguageModel as jest.Mock).mockResolvedValue(
      'languageModel',
    );
    (generateText as jest.Mock).mockResolvedValue({ text: 'answer' });

    const auth = {
      provider: AiProviderEnum.OPENAI,
      model: 'gpt-test',
      apiKey: 'k',
      providerSettings: { someProviderSetting: true },
      modelSettings: { maxRetries: 2 },
    };

    const context = createContext(auth, { prompt: 'Hello' });

    const result = await analyze.run(context);

    expect(getAiProviderLanguageModel).toHaveBeenCalledWith({
      provider: AiProviderEnum.OPENAI,
      apiKey: 'k',
      model: 'gpt-test',
      providerSettings: { someProviderSetting: true },
    });

    expect(generateText).toHaveBeenCalledWith({
      model: 'languageModel',
      prompt: 'Hello',
      maxRetries: 2,
    });

    expect(result).toBe('answer');
  });

  test('should include sources in composed prompt and pass baseURL in providerSettings', async () => {
    (getAiProviderLanguageModel as jest.Mock).mockResolvedValue(
      'languageModel',
    );
    (generateText as jest.Mock).mockResolvedValue({ text: 'final' });

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
      sources: ['s1', 's2'],
    });

    const result = await analyze.run(context);

    expect(getAiProviderLanguageModel).toHaveBeenCalledWith({
      provider: AiProviderEnum.OPENAI,
      apiKey: 'secret',
      model: 'gpt-4',
      providerSettings: { region: 'us', baseURL: 'http://llm.local' },
    });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'languageModel',
        prompt: 'Analyze this\n\nSources:\ns1,s2',
        temperature: 0.3,
      }),
    );

    expect(result).toBe('final');
  });
  test('should use customModel when provided', async () => {
    (getAiProviderLanguageModel as jest.Mock).mockResolvedValue('lm');
    (generateText as jest.Mock).mockResolvedValue({ text: 'ok' });

    const auth = {
      provider: AiProviderEnum.OPENAI,
      model: 'CUSTOM',
      customModel: 'gpt-4o-mini',
      apiKey: 'sk',
      providerSettings: {},
      modelSettings: {},
    };

    const context = createContext(auth, { prompt: 'Hi' });

    const result = await analyze.run(context);

    expect(getAiProviderLanguageModel).toHaveBeenCalledWith({
      provider: AiProviderEnum.OPENAI,
      apiKey: 'sk',
      model: 'gpt-4o-mini',
      providerSettings: {},
    });

    expect(generateText).toHaveBeenCalledWith({
      model: 'lm',
      prompt: 'Hi',
    });

    expect(result).toBe('ok');
  });
});

function createContext(auth?: unknown, props?: unknown) {
  return {
    ...jest.requireActual('@openops/blocks-framework'),
    auth: auth,
    propsValue: props,
  } as any;
}
