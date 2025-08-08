import { createTogetherAI } from '@ai-sdk/togetherai';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const togetherAiModels = [
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3-70B-Instruct-Turbo',
  'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF',
  'Qwen/Qwen2.5-Coder-32B-Instruct',
  'Qwen/QwQ-32B-Preview',
  'google/gemma-2-27b-it',
  'google/gemma-2-9b-it',
  'databricks/dbrx-instruct',
  'deepseek-ai/deepseek-llm-67b-chat',
  'deepseek-ai/DeepSeek-V3',
  'mistralai/Mixtral-8x22B-Instruct-v0.1',
  'Qwen/Qwen2.5-72B-Instruct-Turbo',
  'Qwen/Qwen2-72B-Instruct',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createTogetherAI({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const togetherAiProvider: AiProvider = {
  models: togetherAiModels,
  createLanguageModel,
};
