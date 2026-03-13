import { createTogetherAI } from '@ai-sdk/togetherai';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const togetherAiModels = [
  'MiniMaxAI/MiniMax-M2.5',
  'Qwen/Qwen3-235B-A22B-Instruct-2507-tput',
  'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8',
  'Qwen/Qwen3-Coder-Next-FP8',
  'Qwen/Qwen3-Next-80B-A3B-Instruct',
  'Qwen/Qwen3.5-397B-A17B',
  'deepseek-ai/DeepSeek-R1',
  'deepseek-ai/DeepSeek-V3',
  'deepseek-ai/DeepSeek-V3-1',
  'essentialai/Rnj-1-Instruct',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'moonshotai/Kimi-K2-Instruct',
  'moonshotai/Kimi-K2.5',
  'openai/gpt-oss-120b',
  'zai-org/GLM-4.6',
  'zai-org/GLM-4.7',
  'zai-org/GLM-5',
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
