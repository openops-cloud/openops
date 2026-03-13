import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const googleModels = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.5-flash-lite-preview-09-2025',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-flash-preview-05-20',
  'gemini-2.5-flash-preview-09-2025',
  'gemini-2.5-pro',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-pro-preview-06-05',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
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
