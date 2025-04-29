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
  return createOpenAICompatible({
    name: 'open-ai-compatible-provider',
    apiKey: params.apiKey,
    ...params.providerSettings,
    baseURL: params.providerSettings['baseURL'] as string,
  })(params.model);
}

export const openaiCompatibleProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
