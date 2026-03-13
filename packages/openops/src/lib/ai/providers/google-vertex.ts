import { createVertex } from '@ai-sdk/google-vertex';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

const googleVertexGeminiModels = [
  'deepseek-ai/deepseek-v3.1-maas',
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
  'gemini-3.1-pro-preview',
  'gemini-3.1-pro-preview-customtools',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'meta/llama-3.3-70b-instruct-maas',
  'meta/llama-4-maverick-17b-128e-instruct-maas',
  'openai/gpt-oss-120b-maas',
  'openai/gpt-oss-20b-maas',
  'qwen/qwen3-235b-a22b-instruct-2507-maas',
  'zai-org/glm-4.7-maas',
  'zai-org/glm-5-maas',
];

const googleVertexClaudeModels = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-opus-4-5@20251101',
  'claude-sonnet-4-5@20250929',
  'claude-haiku-4-5@20251001',
  'claude-3-haiku@20240307',
  'claude-3-5-haiku@20241022',
  'claude-3-7-sonnet@20250219',
  'claude-sonnet-4@20250514',
  'claude-opus-4@20250514',
  'claude-opus-4-1@20250805',
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
