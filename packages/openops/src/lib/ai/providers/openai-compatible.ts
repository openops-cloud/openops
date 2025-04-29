import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  if (!params.providerSettings?.['baseURL']) {
    throw new Error('baseURL is required for OpenAI-compatible providers');
  }

  const { baseURL, ...restProviderSettings } = params.providerSettings as {
    baseURL: string;
  } & Record<string, unknown>;

  return createOpenAICompatible({
    name: 'open-ai-compatible-provider',
    apiKey: params.apiKey,
    ...restProviderSettings,
    baseURL,
  })(params.model);
}

export const openaiCompatibleProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
