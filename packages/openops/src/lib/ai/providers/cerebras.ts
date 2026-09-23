// https://inference-docs.cerebras.ai/introduction
import { createCerebras } from '@ai-sdk/cerebras';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const cerebrasModels = ['gemma-4-31b', 'gpt-oss-120b'];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createCerebras({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const cerebrasProvider: AiProvider = {
  models: cerebrasModels,
  createLanguageModel,
};
