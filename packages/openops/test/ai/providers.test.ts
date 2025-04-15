const modelsMock = {
  ...jest.requireActual('@openops/common'),
  openAiModels: ['openAiModel'],
  anthropicModels: ['anthropicModel'],
  bedrockModels: ['bedrockModel'],
  xaiModels: ['xaiModel'],
  googleModels: ['googleModel'],
  mistralModels: ['mistralModel'],
  togetherAiModels: ['togetherModel'],
  cohereModels: ['cohereModel'],
  deepInfraModels: ['deepinfraModel'],
  deepSeekModels: ['deepseekModel'],
  cerebrasModels: ['cerebrasModel'],
  groqModels: ['groqModel'],
  perplexityModels: ['perplexityModel'],
  lmntModels: ['lmntModel'],
};

jest.mock('../../src/lib/ai/provider-models', () => modelsMock);

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
      { aiProvider: AiProviderEnum.AZURE_OPENAI, models: [] },
      { aiProvider: AiProviderEnum.CEREBRAS, models: ['cerebrasModel'] },
      { aiProvider: AiProviderEnum.COHERE, models: ['cohereModel'] },
      { aiProvider: AiProviderEnum.DEEPINFRA, models: ['deepinfraModel'] },
      { aiProvider: AiProviderEnum.DEEPSEEK, models: ['deepseekModel'] },
      { aiProvider: AiProviderEnum.GOOGLE, models: ['googleModel'] },
      { aiProvider: AiProviderEnum.GROQ, models: ['groqModel'] },
      { aiProvider: AiProviderEnum.LMNT, models: ['lmntModel'] },
      { aiProvider: AiProviderEnum.MISTRAL, models: ['mistralModel'] },
      { aiProvider: AiProviderEnum.OPENAI, models: ['openAiModel'] },
      { aiProvider: AiProviderEnum.PERPLEXITY, models: ['perplexityModel'] },
      { aiProvider: AiProviderEnum.TOGETHER_AI, models: ['togetherModel'] },
      { aiProvider: AiProviderEnum.XAI, models: ['xaiModel'] },
    ];

    expect(result).toEqual(expected);
  });
});
