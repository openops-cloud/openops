jest.mock('../../src/lib/ai/providers/amazon-bedrock', () => ({
  amazonBedrockProvider: { getModels: jest.fn(() => ['amazonModel']) },
}));

jest.mock('../../src/lib/ai/providers/anthropic', () => ({
  anthropicProvider: { getModels: jest.fn(() => ['anthropicModel']) },
}));

jest.mock('../../src/lib/ai/providers/azure-openai', () => ({
  azureOpenAiProvider: { getModels: jest.fn(() => ['azureModel']) },
}));

jest.mock('../../src/lib/ai/providers/baseten-openai-compatible', () => ({
  basetenProvider: { getModels: jest.fn(() => ['basetenModel']) },
}));

jest.mock('../../src/lib/ai/providers/cerebras', () => ({
  cerebrasProvider: { getModels: jest.fn(() => ['cerebrasModel']) },
}));

jest.mock('../../src/lib/ai/providers/cohere', () => ({
  cohereProvider: { getModels: jest.fn(() => ['cohereModel']) },
}));

jest.mock('../../src/lib/ai/providers/deep-infra', () => ({
  deepinfraProvider: { getModels: jest.fn(() => ['deepinfraModel']) },
}));

jest.mock('../../src/lib/ai/providers/deep-seek', () => ({
  deepseekProvider: { getModels: jest.fn(() => ['deepseekModel']) },
}));

jest.mock('../../src/lib/ai/providers/google', () => ({
  googleProvider: { getModels: jest.fn(() => ['googleModel']) },
}));

jest.mock('../../src/lib/ai/providers/groq', () => ({
  groqProvider: { getModels: jest.fn(() => ['groqModel']) },
}));

jest.mock('../../src/lib/ai/providers/lmnt', () => ({
  lmntProvider: { getModels: jest.fn(() => ['lmntModel']) },
}));

jest.mock('../../src/lib/ai/providers/lmstudio-openai-compatible', () => ({
  lmstudioProvider: { getModels: jest.fn(() => ['lmstudioModel']) },
}));

jest.mock('../../src/lib/ai/providers/mistral', () => ({
  mistralProvider: { getModels: jest.fn(() => ['mistralModel']) },
}));

jest.mock('../../src/lib/ai/providers/nim-openai-compatible', () => ({
  nimProvider: { getModels: jest.fn(() => ['nimModel']) },
}));

jest.mock('../../src/lib/ai/providers/openai', () => ({
  openAiProvider: { getModels: jest.fn(() => ['openAiModel']) },
}));

jest.mock('../../src/lib/ai/providers/perplexity', () => ({
  perplexityProvider: { getModels: jest.fn(() => ['perplexityModel']) },
}));

jest.mock('../../src/lib/ai/providers/together-ai', () => ({
  togetherAiProvider: { getModels: jest.fn(() => ['togetherModel']) },
}));

jest.mock('../../src/lib/ai/providers/xai', () => ({
  xaiProvider: { getModels: jest.fn(() => ['xaiModel']) },
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
    const models = result.getModels();

    expect(models).toStrictEqual(['openAiModel']);
  });
});

describe('getAvailableProvidersWithModels', () => {
  it('should return a list of all providers with mocked model arrays', () => {
    const result = getAvailableProvidersWithModels();

    const expected = [
      { aiProvider: AiProviderEnum.AMAZON_BEDROCK, models: ['bedrockModel'] },
      { aiProvider: AiProviderEnum.ANTHROPIC, models: ['anthropicModel'] },
      { aiProvider: AiProviderEnum.AZURE_OPENAI, models: ['openaiModel'] },
      { aiProvider: AiProviderEnum.BASETEN, models: ['basetenModel'] },
      { aiProvider: AiProviderEnum.CEREBRAS, models: ['cerebrasModel'] },
      { aiProvider: AiProviderEnum.COHERE, models: ['cohereModel'] },
      { aiProvider: AiProviderEnum.DEEPINFRA, models: ['deepinfraModel'] },
      { aiProvider: AiProviderEnum.DEEPSEEK, models: ['deepseekModel'] },
      { aiProvider: AiProviderEnum.GOOGLE, models: ['googleModel'] },
      { aiProvider: AiProviderEnum.GROQ, models: ['groqModel'] },
      { aiProvider: AiProviderEnum.LMNT, models: ['lmntModel'] },
      { aiProvider: AiProviderEnum.LMSTUDIO, models: ['lmstudioModel'] },
      { aiProvider: AiProviderEnum.NIM, models: ['nimModel'] },
      { aiProvider: AiProviderEnum.MISTRAL, models: ['mistralModel'] },
      { aiProvider: AiProviderEnum.OPENAI, models: ['openAiModel'] },
      { aiProvider: AiProviderEnum.PERPLEXITY, models: ['perplexityModel'] },
      { aiProvider: AiProviderEnum.TOGETHER_AI, models: ['togetherModel'] },
      { aiProvider: AiProviderEnum.XAI, models: ['xaiModel'] },
    ];

    expect(result).toHaveLength(18);
    expect(result).toEqual(expected);
  });
});
