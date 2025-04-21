import { createAzure } from '@ai-sdk/azure';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): LanguageModelV1 {
  return createAzure({
    apiKey: params.apiKey,
    baseURL: params.baseUrl,
  })(params.model);
}

export const azureProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
