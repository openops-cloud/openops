import { createDeepInfra } from '@ai-sdk/deepinfra';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const deepInfraModels = [
  'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
  'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  'meta-llama/Llama-3.3-70B-Instruct',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-70B-Instruct',
  'meta-llama/Meta-Llama-3.1-8B-Instruct',
  'meta-llama/Meta-Llama-3.1-405B-Instruct',
  'Qwen/QwQ-32B-Preview',
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  'Qwen/Qwen2.5-Coder-32B-Instruct',
  'nvidia/Llama-3.1-Nemotron-70B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct',
  'meta-llama/Llama-3.2-90B-Vision-Instruct',
  'meta-llama/Llama-3.2-11B-Vision-Instruct',
  'microsoft/WizardLM-2-8x22B',
  'Gryphe/MythoMax-L2-13b',
  'Gryphe/MythoMax-L2-13b-turbo',
  'HuggingFaceH4/zephyr-orpo-141b-A35b-v0.1',
  'NousResearch/Hermes-3-Llama-3.1-405B',
  'Qwen/Qwen2-72B-Instruct',
  'Qwen/Qwen2-7B-Instruct',
  'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2.5-Coder-7B',
  'Sao10K/L3-70B-Euryale-v2.1',
  'Sao10K/L3-8B-Lunaris-v1',
  'Sao10K/L3.1-70B-Euryale-v2.2',
  'cognitivecomputations/dolphin-2.9.1-llama-3-70b',
  'deepseek-ai/DeepSeek-V3',
  'google/gemma-2-27b-it',
  'google/gemma-2-9b-it',
  'lizpreciatior/lzlv_70b_fp16_hf',
  'mattshumer/Reflection-Llama-3.1-70B',
  'meta-llama/Llama-3.2-1B-Instruct',
  'meta-llama/Llama-3.2-3B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'mistralai/Mistral-Nemo-Instruct-2407',
  'nvidia/Nemotron-4-340B-Instruct',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createDeepInfra({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const deepinfraProvider: AiProvider = {
  models: deepInfraModels,
  createLanguageModel,
};
