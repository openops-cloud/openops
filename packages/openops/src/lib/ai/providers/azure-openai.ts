import { createAzure } from '@ai-sdk/azure';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createAzure({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const azureProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
