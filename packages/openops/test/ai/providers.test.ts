jest.mock('../../src/lib/ai/providers/amazon-bedrock', () => ({
  amazonBedrockProvider: { models: ['bedrockModel'] },
}));

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

jest.mock('../../src/lib/ai/providers/lmnt', () => ({
  lmntProvider: { models: ['lmntModel'] },
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
  openAiProvider: { models: ['openAiModel'] },
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

import {
  AiProviderEnum,
  getAiProvider,
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
  it('should return a list of all providers with mocked model arrays', () => {
    const result = getAvailableProvidersWithModels();

    const expected = [
      { aiProvider: AiProviderEnum.AMAZON_BEDROCK, models: ['bedrockModel'] },
      { aiProvider: AiProviderEnum.ANTHROPIC, models: ['anthropicModel'] },
      { aiProvider: AiProviderEnum.AZURE_OPENAI, models: ['azureModel'] },
      { aiProvider: AiProviderEnum.CEREBRAS, models: ['cerebrasModel'] },
      { aiProvider: AiProviderEnum.COHERE, models: ['cohereModel'] },
      { aiProvider: AiProviderEnum.DEEPINFRA, models: ['deepinfraModel'] },
      { aiProvider: AiProviderEnum.DEEPSEEK, models: ['deepseekModel'] },
      { aiProvider: AiProviderEnum.GOOGLE, models: ['googleModel'] },
      { aiProvider: AiProviderEnum.GROQ, models: ['groqModel'] },
      { aiProvider: AiProviderEnum.LMNT, models: ['lmntModel'] },
      { aiProvider: AiProviderEnum.MISTRAL, models: ['mistralModel'] },
      { aiProvider: AiProviderEnum.OPENAI, models: ['openAiModel'] },
      {
        aiProvider: AiProviderEnum.OPENAI_COMPATIBLE,
        models: ['openaiCompatibleModel'],
      },
      { aiProvider: AiProviderEnum.PERPLEXITY, models: ['perplexityModel'] },
      { aiProvider: AiProviderEnum.TOGETHER_AI, models: ['togetherModel'] },
      { aiProvider: AiProviderEnum.XAI, models: ['xaiModel'] },
    ];

    expect(result).toHaveLength(16);
    expect(result).toEqual(expected);
  });
});
