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

const isInstanceMock = jest.fn();
const generateTextMock = jest.fn();
jest.mock('ai', () => ({
  AISDKError: { isInstance: isInstanceMock },
  generateText: generateTextMock,
  LanguageModelV1: jest.fn(),
}));

import { AiProviderEnum } from '@openops/shared';
import {
  getAiProvider,
  getAiProviderLanguageModel,
  getAvailableProvidersWithModels,
  validateAiProviderConfig,
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
        provider: AiProviderEnum.ANTHROPIC,
        models: ['anthropicModel'],
      },
      {
        provider: AiProviderEnum.AZURE_OPENAI,
        models: ['azureModel'],
      },
      {
        provider: AiProviderEnum.CEREBRAS,
        models: ['cerebrasModel'],
      },
      {
        provider: AiProviderEnum.COHERE,
        models: ['cohereModel'],
      },
      {
        provider: AiProviderEnum.DEEPINFRA,
        models: ['deepinfraModel'],
      },
      {
        provider: AiProviderEnum.DEEPSEEK,
        models: ['deepseekModel'],
      },
      {
        provider: AiProviderEnum.GOOGLE,
        models: ['googleModel'],
      },
      {
        provider: AiProviderEnum.GROQ,
        models: ['groqModel'],
      },
      {
        provider: AiProviderEnum.MISTRAL,
        models: ['mistralModel'],
      },
      {
        provider: AiProviderEnum.OPENAI,
        models: ['openAiModel'],
      },
      {
        provider: AiProviderEnum.OPENAI_COMPATIBLE,
        models: ['openaiCompatibleModel'],
      },
      {
        provider: AiProviderEnum.PERPLEXITY,
        models: ['perplexityModel'],
      },
      {
        provider: AiProviderEnum.TOGETHER_AI,
        models: ['togetherModel'],
      },
      {
        provider: AiProviderEnum.XAI,
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
      providerSettings: { baseURL: 'https://api.example.com' },
    };

    const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
    openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);

    const result = await getAiProviderLanguageModel(aiConfig);

    expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      providerSettings: { baseURL: 'https://api.example.com' },
    });
    expect(result).toEqual(fakeModel);
  });

  test.each([
    [
      {
        validSetting: 'some value',
        emptyString: '',
        whitespace: '   ',
        nullValue: null,
        undefinedValue: undefined,
      },
      {
        validSetting: 'some value',
      },
    ],
    [
      {
        anotherValid: 'ok',
        baseURL: '',
        somethingElse: undefined,
      },
      {
        anotherValid: 'ok',
      },
    ],
    [
      {
        clean: 'yes',
        garbage1: ' ',
        garbage2: null,
      },
      {
        clean: 'yes',
      },
    ],
  ])(
    'should sanitize providerSettings and only pass valid values',
    async (providerSettings, expectedSanitizedSettings) => {
      const aiConfig = {
        provider: AiProviderEnum.OPENAI,
        apiKey: 'test-api-key',
        model: 'gpt-4',
        providerSettings,
      };

      const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
      openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);

      const result = await getAiProviderLanguageModel(aiConfig);

      expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
        apiKey: aiConfig.apiKey,
        model: aiConfig.model,
        providerSettings: expectedSanitizedSettings,
      });
      expect(result).toEqual(fakeModel);
    },
  );
});

describe('validateAiProviderConfig tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success if we are able to send the message', async () => {
    const aiConfig = {
      provider: AiProviderEnum.OPENAI,
      apiKey: 'test-api-key',
      model: 'gpt-4',
      providerSettings: { baseURL: 'https://api.example.com' },
    };

    const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
    openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);
    generateTextMock.mockResolvedValue('mocked response');

    const result = await validateAiProviderConfig(aiConfig);

    expect(result.valid).toBeTruthy();
    expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      providerSettings: { baseURL: 'https://api.example.com' },
    });
  });

  it('should return an error if we are unable to send the message', async () => {
    const error = new Error('Mocked error');
    error.name = 'Error name';
    const aiConfig = {
      provider: AiProviderEnum.OPENAI,
      apiKey: 'test-api-key',
      model: 'gpt-4',
    };

    const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
    openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);
    generateTextMock.mockRejectedValue(error);
    isInstanceMock.mockReturnValue(false);
    const result = await validateAiProviderConfig(aiConfig);

    expect(result.valid).toBeFalsy();
    expect(result.error?.errorName).toBe('Error name');
    expect(result.error?.errorMessage).toBe('Mocked error');
    expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      providerSettings: {},
    });
  });

  it('should return an error with a redacted message if the error message has the apiKey', async () => {
    const error = new Error('Mocked error test-api-key');
    error.name = 'Error name';
    const aiConfig = {
      provider: AiProviderEnum.OPENAI,
      apiKey: 'test-api-key',
      model: 'gpt-4',
    };

    const fakeModel = { id: 'mock-model', type: 'LanguageModelV1' };
    openAIProviderMock.createLanguageModel.mockResolvedValue(fakeModel);
    generateTextMock.mockRejectedValue(error);
    isInstanceMock.mockReturnValue(true);
    const result = await validateAiProviderConfig(aiConfig);

    expect(result.valid).toBeFalsy();
    expect(result.error?.errorName).toBe('Error name');
    expect(result.error?.errorMessage).toBe('Mocked error **REDACTED**');
    expect(openAIProviderMock.createLanguageModel).toHaveBeenCalledWith({
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      providerSettings: {},
    });
  });
});
