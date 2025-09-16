import { createVertex } from '@ai-sdk/google-vertex';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const googleVertexGeminiModels = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-1.0-pro-001',
  'gemini-1.0-pro-vision-001',
  'gemini-1.0-pro',
  'gemini-1.0-pro-002',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.0-flash-exp',
];

const googleVertexClaudeModels = [
  'claude-opus-4-1@20250805',
  'claude-opus-4@20250514',
  'claude-sonnet-4@20250514',
  'claude-3-7-sonnet@20250219',
  'claude-3-5-sonnet-v2@20241022',
  'claude-3-5-haiku@20241022',
  'claude-3-5-sonnet@20240620',
  'claude-3-haiku@20240307',
  'claude-3-sonnet@20240229',
  'claude-3-opus@20240229',
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
  if (params.apiKey && params.apiKey.trim() !== '') {
    const parsed = parseServiceAccountJson(params.apiKey);
    if (!parsed) {
      throw new Error(
        'Invalid Google Vertex service account JSON provided in apiKey',
      );
    }
    credentials = parsed;
  }

  const isClaude = params.model.toLowerCase().startsWith('claude');
  const provider = isClaude
    ? createVertexAnthropic({
        location,
        project,
        ...(credentials ? { googleAuthOptions: { credentials } } : {}),
      })
    : createVertex({
        location,
        project,
        ...(credentials ? { googleAuthOptions: { credentials } } : {}),
      });

  return provider(params.model);
}

export const googleVertexProvider: AiProvider = {
  models: [...googleVertexGeminiModels, ...googleVertexClaudeModels],
  createLanguageModel,
};
