// https://ai.google.dev/gemini-api/docs/models
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const googleModels = [
  'deep-research-pro-preview-12-2025',
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-001',
  'gemini-1.5-flash-8b-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite-preview-09-2025',
  'gemini-2.5-pro',
  'gemini-2.5-pro-exp-03-25',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
  'gemini-exp-1206',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest',
  'gemma-3-12b-it',
  'gemma-3-1b-it',
  'gemma-3-27b-it',
  'gemma-3-4b-it',
  'gemma-3n-e2b-it',
  'gemma-3n-e4b-it',
];

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  return createGoogleGenerativeAI({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const googleProvider: AiProvider = {
  models: googleModels,
  createLanguageModel,
};
