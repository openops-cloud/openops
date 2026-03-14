/**
 * Syncs AI provider model lists from @ai-sdk type definitions
 *
 * This script fetches the latest TypeScript type definitions from unpkg for each
 * @ai-sdk provider package and extracts the valid model IDs from the union types.
 * Models confirmed to work with the AI SDK are included.
 *
 * Usage:
 *   npx tsx sync-models.ts           # Check for differences
 *   npx tsx sync-models.ts --update  # Update provider files
 */

import { AiProviderEnum } from '@openops/shared';
import fs from 'node:fs';
import path from 'node:path';

interface AiSdkConfig {
  package: string;
  typeName: string;
  providerFile: string;
  distPath?: string;
  arrayName?: string;
  excludedModels?: string[];
  additionalArrays?: Array<{
    distPath: string;
    typeName: string;
    arrayName: string;
    excludedModels?: string[];
  }>;
}

export const AI_SDK_CONFIGS: Partial<Record<AiProviderEnum, AiSdkConfig>> = {
  [AiProviderEnum.ANTHROPIC]: {
    package: 'anthropic',
    typeName: 'AnthropicMessagesModelId',
    providerFile: 'anthropic',
  },
  [AiProviderEnum.CEREBRAS]: {
    package: 'cerebras',
    typeName: 'CerebrasChatModelId',
    providerFile: 'cerebras',
  },
  [AiProviderEnum.COHERE]: {
    package: 'cohere',
    typeName: 'CohereChatModelId',
    providerFile: 'cohere',
  },
  [AiProviderEnum.DEEPSEEK]: {
    package: 'deepseek',
    typeName: 'DeepSeekChatModelId',
    providerFile: 'deep-seek',
  },
  [AiProviderEnum.GOOGLE]: {
    package: 'google',
    typeName: 'GoogleGenerativeAIModelId',
    providerFile: 'google',
  },
  [AiProviderEnum.GOOGLE_VERTEX]: {
    package: 'google-vertex',
    typeName: 'GoogleVertexModelId',
    providerFile: 'google-vertex',
    excludedModels: [
      'gemini-1.0-pro',
      'gemini-1.0-pro-001',
      'gemini-1.0-pro-002',
      'gemini-1.0-pro-vision-001',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash-002',
      'gemini-1.5-pro-001',
      'gemini-1.5-pro-002',
    ],
    additionalArrays: [
      {
        distPath: 'dist/anthropic/index.d.ts',
        typeName: 'GoogleVertexAnthropicMessagesModelId',
        arrayName: 'googleVertexClaudeModels',
      },
    ],
  },
  [AiProviderEnum.GROQ]: {
    package: 'groq',
    typeName: 'GroqChatModelId',
    providerFile: 'groq',
  },
  [AiProviderEnum.MISTRAL]: {
    package: 'mistral',
    typeName: 'MistralChatModelId',
    providerFile: 'mistral',
  },
  [AiProviderEnum.OPENAI]: {
    package: 'openai',
    typeName: 'OpenAIChatModelId',
    providerFile: 'openai',
  },
  [AiProviderEnum.PERPLEXITY]: {
    package: 'perplexity',
    typeName: 'PerplexityLanguageModelId',
    providerFile: 'perplexity',
  },
  [AiProviderEnum.TOGETHER_AI]: {
    package: 'togetherai',
    typeName: 'TogetherAIChatModelId',
    providerFile: 'together-ai',
  },
  [AiProviderEnum.XAI]: {
    package: 'xai',
    typeName: 'XaiChatModelId',
    providerFile: 'xai',
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

async function fetchAiSdkModels(
  pkg: string,
  typeName: string,
  distPath = 'dist/index.d.ts',
  excludedModels: string[] = [],
): Promise<string[]> {
  const url = `https://unpkg.com/@ai-sdk/${pkg}@latest/${distPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch @ai-sdk/${pkg} types: ${response.statusText}`,
    );
  }

  const dts = await response.text();
  const pattern = new RegExp(`type\\s+${typeName}\\s*=\\s*([^;]+);`, 's');
  const match = dts.match(pattern);
  if (!match) {
    throw new Error(`Could not find type ${typeName} in @ai-sdk/${pkg}`);
  }

  return [...match[1].matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter(
      (id) =>
        !NON_CHAT_KEYWORDS.some((kw) => id.toLowerCase().includes(kw)) &&
        !excludedModels.includes(id),
    )
    .sort((a, b) => a.localeCompare(b));
}

function getCurrentModels(providerFile: string, arrayName?: string): string[] {
  const filePath = path.join(__dirname, 'providers', `${providerFile}.ts`);
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');
  const pattern = arrayName
    ? new RegExp(`const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\];`)
    : /const\s+\w+Models\s*=\s*\[([\s\S]*?)\];/;
  const match = content.match(pattern);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((line) => line.match(/['"]([^'"]+)['"]/)?.[1])
    .filter((model): model is string => model != null)
    .sort();
}

function updateProviderFile(
  providerFile: string,
  models: string[],
  arrayName?: string,
): void {
  const filePath = path.join(__dirname, 'providers', `${providerFile}.ts`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const pattern = arrayName
    ? new RegExp(`const\\s+(${arrayName})\\s*=\\s*\\[([\\s\\S]*?)\\];`)
    : /const\s+(\w+Models)\s*=\s*\[([\s\S]*?)\];/;
  const match = content.match(pattern);
  if (!match) return;

  const resolvedArrayName = match[1];
  const formattedModels = models.map((model) => `  '${model}',`).join('\n');
  const newArray = `const ${resolvedArrayName} = [\n${formattedModels}\n];`;
  const updatedContent = content.replace(pattern, newArray);

  fs.writeFileSync(filePath, updatedContent, 'utf-8');
}

async function syncConfig(
  label: string,
  pkg: string,
  typeName: string,
  providerFile: string,
  distPath: string | undefined,
  arrayName: string | undefined,
  excludedModels: string[] | undefined,
  shouldUpdate: boolean,
): Promise<boolean> {
  let latestModels: string[];
  try {
    latestModels = await fetchAiSdkModels(
      pkg,
      typeName,
      distPath,
      excludedModels,
    );
  } catch (error) {
    console.error(`Skipping ${label}: ${(error as Error).message}`);
    return false;
  }

  const currentModels = getCurrentModels(providerFile, arrayName);
  const added = latestModels.filter((m) => !currentModels.includes(m));
  const removed = currentModels.filter((m) => !latestModels.includes(m));

  if (added.length === 0 && removed.length === 0) {
    return false;
  }

  console.log(`${label}:`);
  if (added.length > 0) console.log(`  +${added.length}`);
  if (removed.length > 0) console.log(`  -${removed.length}`);

  if (shouldUpdate) {
    updateProviderFile(providerFile, latestModels, arrayName);
  }

  return true;
}

async function main() {
  const shouldUpdate = process.argv.includes('--update');

  let hasChanges = false;

  for (const [provider, config] of Object.entries(AI_SDK_CONFIGS)) {
    if (!config) continue;

    const changed = await syncConfig(
      provider,
      config.package,
      config.typeName,
      config.providerFile,
      config.distPath,
      config.arrayName,
      config.excludedModels,
      shouldUpdate,
    );
    if (changed) hasChanges = true;

    for (const extra of config.additionalArrays ?? []) {
      const extraChanged = await syncConfig(
        `${provider} (${extra.arrayName})`,
        config.package,
        extra.typeName,
        config.providerFile,
        extra.distPath,
        extra.arrayName,
        extra.excludedModels,
        shouldUpdate,
      );
      if (extraChanged) hasChanges = true;
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
