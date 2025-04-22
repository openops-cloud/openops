const openAIProviderMock = {
  models: ['openAiModel'],
  createLanguageModel: jest.fn(),
};

jest.mock('../../src/lib/ai/providers/anthropic', () => ({
  anthropicProvider: { models: ['anthropicModel'] },
}));

jest.mock('../../src/lib/ai/providers/azure-openai', () => ({
  azureProvider: { models: ['azureModel'] },
}));

jest.mock('../../src/lib/ai/providers/cerebras', () => ({
  cerebrasProvider: { models: ['cerebrasModel'] },
}));

jest.mock('../../src/lib/ai/providers/cohere', () => ({
  cohereProvider: { models: ['cohereModel'] },
}));

jest.mock('../../src/lib/ai/providers/deep-infra', () => ({
  deepinfraProvider: { models: ['deepinfraModel'] },
}));

jest.mock('../../src/lib/ai/providers/deep-seek', () => ({
  deepseekProvider: { models: ['deepseekModel'] },
}));

jest.mock('../../src/lib/ai/providers/google', () => ({
  googleProvider: { models: ['googleModel'] },
}));

jest.mock('../../src/lib/ai/providers/groq', () => ({
  groqProvider: { models: ['groqModel'] },
}));

jest.mock('../../src/lib/ai/providers/openai-compatible', () => ({
  openaiCompatibleProvider: {
    models: ['openaiCompatibleModel'],
  },
}));

jest.mock('../../src/lib/ai/providers/mistral', () => ({
  mistralProvider: { models: ['mistralModel'] },
}));

jest.mock('../../src/lib/ai/providers/openai', () => ({
  openAiProvider: openAIProviderMock,
}));

jest.mock('../../src/lib/ai/providers/perplexity', () => ({
  perplexityProvider: { models: ['perplexityModel'] },
}));

jest.mock('../../src/lib/ai/providers/together-ai', () => ({
  togetherAiProvider: { models: ['togetherModel'] },
}));

jest.mock('../../src/lib/ai/providers/xai', () => ({
  xaiProvider: { models: ['xaiModel'] },
}));

import { AiProviderEnum } from '@openops/shared';
import {
  getAiProvider,
  getAiProviderLanguageModel,
  getAvailableProvidersWithModels,
} from '../../src/lib/ai/providers';

describe('getAiProvider tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return requested provider', () => {
    const result = getAiProvider(AiProviderEnum.OPENAI);
    const models = result.models;

    expect(models).toStrictEqual(['openAiModel']);
  });
});

describe('getAvailableProvidersWithModels', () => {
  it('should return a list of all providers with their display names and mocked model arrays', () => {
    const result = getAvailableProvidersWithModels();

    const expected = [
      {
        provider: 'ANTHROPIC',
        displayName: AiProviderEnum.ANTHROPIC,
        models: ['anthropicModel'],
      },
      {
        provider: 'AZURE_OPENAI',
        displayName: AiProviderEnum.AZURE_OPENAI,
        models: ['azureModel'],
      },
      {
        provider: 'CEREBRAS',
        displayName: AiProviderEnum.CEREBRAS,
        models: ['cerebrasModel'],
      },
      {
        provider: 'COHERE',
        displayName: AiProviderEnum.COHERE,
        models: ['cohereModel'],
      },
      {
        provider: 'DEEPINFRA',
        displayName: AiProviderEnum.DEEPINFRA,
        models: ['deepinfraModel'],
      },
      {
        provider: 'DEEPSEEK',
        displayName: AiProviderEnum.DEEPSEEK,
        models: ['deepseekModel'],
      },
      {
        provider: 'GOOGLE',
        displayName: AiProviderEnum.GOOGLE,
        models: ['googleModel'],
      },
      {
        provider: 'GROQ',
        displayName: AiProviderEnum.GROQ,
        models: ['groqModel'],
      },
      {
        provider: 'MISTRAL',
        displayName: AiProviderEnum.MISTRAL,
        models: ['mistralModel'],
      },
      {
        provider: 'OPENAI',
        displayName: AiProviderEnum.OPENAI,
        models: ['openAiModel'],
      },
      {
        provider: 'OPENAI_COMPATIBLE',
        displayName: AiProviderEnum.OPENAI_COMPATIBLE,
        models: ['openaiCompatibleModel'],
      },
      {
        provider: 'PERPLEXITY',
        displayName: AiProviderEnum.PERPLEXITY,
        models: ['perplexityModel'],
      },
      {
        provider: 'TOGETHER_AI',
        displayName: AiProviderEnum.TOGETHER_AI,
        models: ['togetherModel'],
      },
      {
        provider: 'XAI',
        displayName: AiProviderEnum.XAI,
        models: ['xaiModel'],
      },
    ];

    expect(result).toHaveLength(14);
    expect(result).toEqual(expected);
  });
});

describe('getAiProviderLanguageModel tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a the language model instance when successful', async () => {
    const aiConfig = {
      provider: AiProviderEnum.OPENAI,
      apiKey: 'test-api-key',
      model: 'gpt-4',
      providerSettings: { baseUrl: 'https://api.example.com' },
    };

    const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
    openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);

    const result = await getAiProviderLanguageModel(aiConfig);

    expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      baseUrl: 'https://api.example.com',
    });
    expect(result).toEqual(fakeModel);
  });

  test.each([[''], [' '], [undefined], [null]])(
    'should sanitize the baseUrl for unaccepted values',
    async (baseUrl: string | undefined | null) => {
      const aiConfig = {
        provider: AiProviderEnum.OPENAI,
        apiKey: 'test-api-key',
        model: 'gpt-4',
        providerSettings: { baseUrl },
      };

      const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
      openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);

      const result = await getAiProviderLanguageModel(aiConfig);

      expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        baseUrl: undefined,
      });
      expect(result).toEqual(fakeModel);
    },
  );
});
