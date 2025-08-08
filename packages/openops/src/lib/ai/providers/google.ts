import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';
import { AiProvider } from '../providers';

const googleModels = [
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-latest',
  'gemini-1.5-flash-8b-001',
  'gemini-2.5-pro-exp-03-25',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-exp-1206',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModelV1 {
  return createGoogleGenerativeAI({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const googleProvider: AiProvider = {
  models: googleModels,
  createLanguageModel,
};
