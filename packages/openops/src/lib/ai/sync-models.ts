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

interface TypeSource {
  typeName: string;
  distPath?: string;
  excludedModels?: string[];
}

interface AiSdkConfig {
  package: string;
  providerFile: string;
  typeSources: TypeSource[];
}

export const AI_SDK_CONFIGS: Partial<Record<AiProviderEnum, AiSdkConfig>> = {
  [AiProviderEnum.ANTHROPIC]: {
    package: 'anthropic',
    providerFile: 'anthropic',
    typeSources: [{ typeName: 'AnthropicMessagesModelId' }],
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
  },
  [AiProviderEnum.DEEPSEEK]: {
    package: 'deepseek',
    providerFile: 'deep-seek',
    typeSources: [{ typeName: 'DeepSeekChatModelId' }],
  },
  [AiProviderEnum.GOOGLE]: {
    package: 'google',
    providerFile: 'google',
    typeSources: [{ typeName: 'GoogleGenerativeAIModelId' }],
  },
  [AiProviderEnum.GOOGLE_VERTEX]: {
    package: 'google-vertex',
    providerFile: 'google-vertex',
    typeSources: [
      {
        typeName: 'GoogleVertexModelId',
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
      },
      {
        typeName: 'GoogleVertexAnthropicMessagesModelId',
        distPath: 'dist/anthropic/index.d.ts',
      },
    ],
  },
  [AiProviderEnum.GROQ]: {
    package: 'groq',
    providerFile: 'groq',
    typeSources: [{ typeName: 'GroqChatModelId' }],
  },
  [AiProviderEnum.MISTRAL]: {
    package: 'mistral',
    providerFile: 'mistral',
    typeSources: [{ typeName: 'MistralChatModelId' }],
  },
  [AiProviderEnum.OPENAI]: {
    package: 'openai',
    providerFile: 'openai',
    typeSources: [{ typeName: 'OpenAIChatModelId' }],
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
  },
  [AiProviderEnum.XAI]: {
    package: 'xai',
    providerFile: 'xai',
    typeSources: [{ typeName: 'XaiChatModelId' }],
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
    `type\\s+${source.typeName}\\s*=\\s*([^;]+);`,
    's',
  );
  const match = dts.match(pattern);
  if (!match) {
    throw new Error(`Could not find type ${source.typeName} in @ai-sdk/${pkg}`);
  }

  const excluded = source.excludedModels ?? [];
  return [...match[1].matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter(
      (id) =>
        !NON_CHAT_KEYWORDS.some((kw) => id.toLowerCase().includes(kw)) &&
        !excluded.includes(id),
    );
}

function getCurrentModels(providerFile: string): string[] {
  const filePath = path.join(__dirname, 'providers', `${providerFile}.ts`);
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
  const filePath = path.join(__dirname, 'providers', `${providerFile}.ts`);
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
      latestModels = [...new Set(results.flat())].sort((a, b) =>
        a.localeCompare(b),
      );
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
