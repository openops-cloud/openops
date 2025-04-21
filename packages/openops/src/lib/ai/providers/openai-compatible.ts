import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl: string;
}): LanguageModelV1 {
  return createOpenAICompatible({
    name: 'open-ai-compatible-provider',
    apiKey: params.apiKey,
    baseURL: params.baseUrl,
  })(params.model);
}

export const openaiCompatibleProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
