// https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models
import { createVertex } from '@ai-sdk/google-vertex';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const googleVertexGeminiModels = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite-preview-09-2025',
  'gemini-2.5-flash-preview-09-2025',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
];

const googleVertexClaudeModels = [
  'claude-3-5-haiku@20241022',
  'claude-3-5-sonnet-v2@20241022',
  'claude-3-5-sonnet@20240620',
  'claude-3-7-sonnet@20250219',
  'claude-3-haiku@20240307',
  'claude-3-opus@20240229',
  'claude-3-sonnet@20240229',
  'claude-opus-4-1@20250805',
  'claude-opus-4-5@20251101',
  'claude-opus-4-6',
  'claude-opus-4@20250514',
  'claude-sonnet-4-5@20250929',
  'claude-sonnet-4-6',
  'claude-sonnet-4@20250514',
];

function safeParseJson(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseServiceAccountJson(
  input: string,
): Record<string, unknown> | null {
  const direct = safeParseJson(input);
  if (direct) {
    return direct;
  }
  const decoded = Buffer.from(input, 'base64').toString('utf8');
  return safeParseJson(decoded);
}

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  const settings = params.providerSettings ?? {};
  const location = settings['location'] as string | undefined;
  const project = settings['project'] as string | undefined;

  let credentials: Record<string, unknown> | null = null;
  const apiKey = params.apiKey?.trim();
  if (apiKey) {
    credentials = parseServiceAccountJson(apiKey);
    if (!credentials) {
      throw new Error(
        'Invalid Google Vertex service account JSON provided in apiKey',
      );
    }
  }

  const providerConfig = {
    location,
    project,
    ...(credentials ? { googleAuthOptions: { credentials } } : {}),
  };

  const isClaude = params.model.toLowerCase().startsWith('claude');
  const provider = isClaude
    ? createVertexAnthropic(providerConfig)
    : createVertex(providerConfig);

  return provider(params.model);
}

export const googleVertexProvider: AiProvider = {
  models: [...googleVertexGeminiModels, ...googleVertexClaudeModels],
  createLanguageModel,
};
