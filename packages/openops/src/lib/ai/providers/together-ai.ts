// https://docs.together.ai/docs/serverless-models
import { createTogetherAI } from '@ai-sdk/togetherai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const togetherAiModels = [
  'deepseek-ai/DeepSeek-V3',
  'google/gemma-2-27b-it',
  'google/gemma-2-9b-it',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
  'Qwen/Qwen2-72B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct-Turbo',
  'Qwen/Qwen2.5-Coder-32B-Instruct',
  'Qwen/QwQ-32B-Preview',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createTogetherAI({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const togetherAiProvider: AiProvider = {
  models: togetherAiModels,
  createLanguageModel,
};
