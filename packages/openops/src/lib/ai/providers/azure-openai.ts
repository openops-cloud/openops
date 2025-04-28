import { createAzure } from '@ai-sdk/azure';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createAzure({
    apiKey: params.apiKey,
    baseURL: params.baseUrl,
    ...params.providerSettings,
  })(params.model);
}

export const azureProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
