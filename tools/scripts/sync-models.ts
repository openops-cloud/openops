/**
 * Syncs AI provider model lists from @ai-sdk type definitions
 *
 * This script fetches the latest TypeScript type definitions from unpkg for each
 * @ai-sdk provider package and extracts the valid model IDs from the union types.
 * Models confirmed to work with the AI SDK are included.
 *
 * Usage:
 *   npx tsx tools/scripts/sync-models.ts           # Check for differences
 *   npx tsx tools/scripts/sync-models.ts --update  # Update provider files
 */

import { AiProviderEnum } from '@openops/shared';
import fs from 'node:fs';
import path from 'node:path';

interface TypeSource {
  typeName: string;
  distPath?: string;
}

interface AiSdkConfig {
  package: string;
  providerFile: string;
  typeSources: TypeSource[];
  excludedModels?: string[];
}

export const AI_SDK_CONFIGS: Partial<Record<AiProviderEnum, AiSdkConfig>> = {
  [AiProviderEnum.ANTHROPIC]: {
    package: 'anthropic',
    providerFile: 'anthropic',
    typeSources: [{ typeName: 'AnthropicMessagesModelId' }],
    excludedModels: [
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
    ],
  },
  [AiProviderEnum.CEREBRAS]: {
    package: 'cerebras',
    providerFile: 'cerebras',
    typeSources: [{ typeName: 'CerebrasChatModelId' }],
  },
  [AiProviderEnum.COHERE]: {
    package: 'cohere',
    providerFile: 'cohere',
    typeSources: [{ typeName: 'CohereChatModelId' }],
    excludedModels: [
      'command-r-plus-04-2024',
      'command-r-03-2024',
      'command',
      'command-nightly',
      'command-light',
      'command-light-nightly',
    ],
  },
  [AiProviderEnum.DEEPSEEK]: {
    package: 'deepseek',
    providerFile: 'deep-seek',
    typeSources: [{ typeName: 'DeepSeekChatModelId' }],
  },
  [AiProviderEnum.DEEPINFRA]: {
    package: 'deepinfra',
    providerFile: 'deep-infra',
    typeSources: [{ typeName: 'DeepInfraChatModelId' }],
    excludedModels: [
      '01-ai/Yi-34B-Chat',
      'Austism/chronos-hermes-13b-v2',
      'KoboldAI/LLaMA2-13B-Tiefighter',
      'Phind/Phind-CodeLlama-34B-v2',
      'bigcode/starcoder2-15b',
      'bigcode/starcoder2-15b-instruct-v0.1',
      'codellama/CodeLlama-34b-Instruct-hf',
      'codellama/CodeLlama-70b-Instruct-hf',
      'cognitivecomputations/dolphin-2.6-mixtral-8x7b',
      'databricks/dbrx-instruct',
      'deepinfra/airoboros-70b',
      'google/codegemma-7b-it',
      'google/gemma-1.1-7b-it',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-2-70b-chat-hf',
      'meta-llama/Llama-2-7b-chat-hf',
      'meta-llama/Meta-Llama-3-70B-Instruct',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'microsoft/Phi-3-medium-4k-instruct',
      'microsoft/WizardLM-2-7B',
      'mistralai/Mistral-7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'mistralai/Mixtral-8x22B-v0.1',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'openbmb/MiniCPM-Llama3-V-2_5',
      'openchat/openchat-3.6-8b',
      'openchat/openchat_3.5',
    ],
  },
  [AiProviderEnum.GOOGLE]: {
    package: 'google',
    providerFile: 'google',
    typeSources: [{ typeName: 'GoogleGenerativeAIModelId' }],
    excludedModels: [
      'deep-research-pro-preview-12-2025',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-lite-001',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-lite-preview-09-2025',
      'gemini-flash-lite-latest',
      'gemma-3-12b-it',
      'gemma-3-1b-it',
      'gemma-3-27b-it',
      'gemma-3-4b-it',
      'gemma-3n-e2b-it',
      'gemma-3n-e4b-it',
      'learnlm-1.5-pro-experimental',
    ],
  },
  [AiProviderEnum.GOOGLE_VERTEX]: {
    package: 'google-vertex',
    providerFile: 'google-vertex',
    typeSources: [
      { typeName: 'GoogleVertexModelId' },
      {
        typeName: 'GoogleVertexAnthropicMessagesModelId',
        distPath: 'dist/anthropic/index.d.ts',
      },
    ],
    excludedModels: [
      'claude-3-5-haiku@20241022',
      'claude-3-haiku@20240307',
      'claude-3-opus@20240229',
      'claude-3-sonnet@20240229',
      'gemini-1.0-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.0-pro-001',
      'gemini-1.0-pro-002',
      'gemini-1.0-pro-vision-001',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash-002',
      'gemini-1.5-pro-001',
      'gemini-1.5-pro-002',
      'gemini-2.0-flash-lite-preview-02-05',
      'gemini-2.5-flash-lite-preview-09-2025',
    ],
  },
  [AiProviderEnum.GROQ]: {
    package: 'groq',
    providerFile: 'groq',
    typeSources: [{ typeName: 'GroqChatModelId' }],
    excludedModels: [
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'qwen-qwq-32b',
    ],
  },
  [AiProviderEnum.MISTRAL]: {
    package: 'mistral',
    providerFile: 'mistral',
    typeSources: [{ typeName: 'MistralChatModelId' }],
    excludedModels: [
      'open-mistral-7b',
      'open-mixtral-8x7b',
      'open-mixtral-8x22b',
    ],
  },
  [AiProviderEnum.OPENAI]: {
    package: 'openai',
    providerFile: 'openai',
    typeSources: [{ typeName: 'OpenAIChatModelId' }],
    excludedModels: [
      'chatgpt-4o-latest',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-16k',
      'gpt-4',
      'gpt-4-0125-preview',
      'gpt-4-0613',
      'gpt-4-1106-preview',
      'gpt-4-turbo',
      'gpt-4-turbo-2024-04-09',
      'gpt-4-turbo-preview',
      'gpt-4.1-mini-2025-04-14',
      'gpt-4.1-nano-2025-04-14',
      'gpt-4.5-preview',
      'gpt-4.5-preview-2025-02-27',
      'gpt-4o-2024-05-13',
      'gpt-4o-mini',
      'gpt-4o-mini-2024-07-18',
      'gpt-5-mini-2025-08-07',
      'gpt-5-nano-2025-08-07',
      'o1-mini',
      'o1-mini-2024-09-12',
      'o1-preview',
      'o1-preview-2024-09-12',
      'o3-mini',
      'o3-mini-2025-01-31',
      'o4-mini-2025-04-16',
    ],
  },
  [AiProviderEnum.PERPLEXITY]: {
    package: 'perplexity',
    providerFile: 'perplexity',
    typeSources: [{ typeName: 'PerplexityLanguageModelId' }],
  },
  [AiProviderEnum.TOGETHER_AI]: {
    package: 'togetherai',
    providerFile: 'together-ai',
    typeSources: [{ typeName: 'TogetherAIChatModelId' }],
    excludedModels: [
      'Gryphe/MythoMax-L2-13b',
      'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
      'Qwen/Qwen2.5-7B-Instruct-Turbo',
      'databricks/dbrx-instruct',
      'deepseek-ai/deepseek-llm-67b-chat',
      'google/gemma-2b-it',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-3-70b-chat-hf',
      'meta-llama/Llama-3-8b-chat-hf',
      'meta-llama/Llama-3.2-3B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3-70B-Instruct-Lite',
      'meta-llama/Meta-Llama-3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3-8B-Instruct-Lite',
      'meta-llama/Meta-Llama-3-8B-Instruct-Turbo',
      'microsoft/WizardLM-2-8x22B',
      'mistralai/Mistral-7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'Qwen/QwQ-32B-Preview',
      'upstage/SOLAR-10.7B-Instruct-v1.0',
    ],
  },
  [AiProviderEnum.XAI]: {
    package: 'xai',
    providerFile: 'xai',
    typeSources: [{ typeName: 'XaiChatModelId' }],
    excludedModels: [
      'grok-3-mini',
      'grok-3-mini-fast',
      'grok-3-mini-fast-latest',
    ],
  },
};

const NON_CHAT_KEYWORDS = [
  'guard',
  'embed',
  'audio',
  'tts',
  'native-audio',
  'imagen',
  'search-preview',
  'aqa',
  'robotics',
  'computer-use',
  'nano-banana',
  'veo',
  '-image',
];

const PROVIDERS_DIR = path.join(
  __dirname,
  '../../packages/openops/src/lib/ai/providers',
);

async function fetchAiSdkModels(
  pkg: string,
  source: TypeSource,
): Promise<string[]> {
  const distPath = source.distPath ?? 'dist/index.d.ts';
  const url = `https://unpkg.com/@ai-sdk/${pkg}@latest/${distPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch @ai-sdk/${pkg} types: ${response.statusText}`,
    );
  }

  const dts = await response.text();
  const pattern = new RegExp(
    String.raw`type\s+${source.typeName}\s*=\s*([^;]+);`,
    's',
  );
  const match = pattern.exec(dts);
  if (!match) {
    throw new Error(`Could not find type ${source.typeName} in @ai-sdk/${pkg}`);
  }

  return [...match[1].matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter(
      (id) => !NON_CHAT_KEYWORDS.some((kw) => id.toLowerCase().includes(kw)),
    );
}

function getCurrentModels(providerFile: string): string[] {
  const filePath = path.join(PROVIDERS_DIR, `${providerFile}.ts`);
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/const\s+\w+Models\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((line) => line.match(/['"]([^'"]+)['"]/)?.[1])
    .filter((model): model is string => model != null)
    .sort();
}

function updateProviderFile(providerFile: string, models: string[]): void {
  const filePath = path.join(PROVIDERS_DIR, `${providerFile}.ts`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/const\s+(\w+Models)\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return;

  const arrayName = match[1];
  const formattedModels = models.map((model) => `  '${model}',`).join('\n');
  const newArray = `const ${arrayName} = [\n${formattedModels}\n];`;
  const updatedContent = content.replace(
    /const\s+\w+Models\s*=\s*\[([\s\S]*?)\];/,
    newArray,
  );

  fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

async function main() {
  const shouldUpdate = process.argv.includes('--update');

  let hasChanges = false;

  for (const [provider, config] of Object.entries(AI_SDK_CONFIGS)) {
    if (!config) continue;

    let latestModels: string[];
    try {
      const results = await Promise.all(
        config.typeSources.map((source) =>
          fetchAiSdkModels(config.package, source),
        ),
      );
      const excluded = config.excludedModels ?? [];
      latestModels = [...new Set(results.flat())]
        .filter((m) => !excluded.includes(m))
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error(`Skipping ${provider}: ${(error as Error).message}`);
      continue;
    }

    const currentModels = getCurrentModels(config.providerFile);
    const added = latestModels.filter((m) => !currentModels.includes(m));
    const removed = currentModels.filter((m) => !latestModels.includes(m));

    if (added.length === 0 && removed.length === 0) {
      continue;
    }

    hasChanges = true;
    console.log(`${provider}:`);
    if (added.length > 0) console.log(`  +${added.length}`);
    if (removed.length > 0) console.log(`  -${removed.length}`);

    if (shouldUpdate) {
      updateProviderFile(config.providerFile, latestModels);
    }
  }

  process.exit(hasChanges ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}
