/**
 * Syncs AI provider model lists from models.dev
 *
 * This script fetches the latest AI model data from models.dev and updates
 * our provider files accordingly. It filters for text-only models and excludes
 * embedding models.
 *
 * Data source: https://models.dev (MIT License)
 * API endpoint: https://models.dev/api.json
 * GitHub: https://github.com/anomalyco/models.dev
 *
 * Usage:
 *   npx tsx sync-models.ts           # Check for differences
 *   npx tsx sync-models.ts --update  # Update provider files
 */

import { AiProviderEnum } from '@openops/shared';
import fs from 'node:fs';
import path from 'node:path';

interface ModelData {
  id: string;
  status?: 'alpha' | 'beta' | 'deprecated';
  modalities: {
    input: string[];
    output: string[];
  };
}

interface ProviderData {
  models: Record<string, ModelData>;
}

interface ModelsDevAPI {
  [providerKey: string]: ProviderData;
}

export const MODELS_DEV_KEYS: Partial<Record<AiProviderEnum, string>> = {
  [AiProviderEnum.ANTHROPIC]: 'anthropic',
  [AiProviderEnum.CEREBRAS]: 'cerebras',
  [AiProviderEnum.COHERE]: 'cohere',
  // [AiProviderEnum.DEEPINFRA]: 'deepinfra', // Temporarily disabled until models.dev PR is merged
  [AiProviderEnum.DEEPSEEK]: 'deepseek',
  [AiProviderEnum.GOOGLE]: 'google',
  [AiProviderEnum.GOOGLE_VERTEX]: 'google-vertex',
  [AiProviderEnum.GROQ]: 'groq',
  [AiProviderEnum.MISTRAL]: 'mistral',
  [AiProviderEnum.OPENAI]: 'openai',
  [AiProviderEnum.PERPLEXITY]: 'perplexity',
  [AiProviderEnum.TOGETHER_AI]: 'togetherai',
  [AiProviderEnum.XAI]: 'xai',
};

const MULTI_ARRAY_PROVIDERS: Array<{
  modelsDevKey: string;
  providerFile: string;
  arrayName: string;
  label: string;
}> = [
  {
    modelsDevKey: 'google-vertex-anthropic',
    providerFile: 'google-vertex',
    arrayName: 'googleVertexClaudeModels',
    label: 'Google Vertex AI (Anthropic)',
  },
];

async function fetchModelsDevData(): Promise<ModelsDevAPI> {
  const response = await fetch('https://models.dev/api.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch models.dev API: ${response.statusText}`);
  }
  return response.json();
}

function filterTextOnlyModels(models: Record<string, ModelData>): string[] {
  return Object.values(models)
    .filter((model) => {
      const outputModalities = model.modalities?.output || [];
      const isTextOnly =
        outputModalities.length === 1 && outputModalities[0] === 'text';
      const isEmbedding = model.id.toLowerCase().includes('embedding');
      const isDeprecated = model.status === 'deprecated';
      const hasTextInput = model.modalities?.input?.includes('text');
      return isTextOnly && !isEmbedding && !isDeprecated && hasTextInput;
    })
    .map((model) => model.id)
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
    .filter((model): model is string => model !== null)
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

function findProviderFile(modelsDevKey: string): string | null {
  const providersDir = path.join(__dirname, 'providers');
  const files = fs
    .readdirSync(providersDir)
    .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
    .map((file) => file.replace('.ts', ''));

  const normalizedKey = modelsDevKey.toLowerCase().replaceAll(/[-_]/g, '');
  return (
    files.find(
      (file) => file.toLowerCase().replaceAll(/[-_]/g, '') === normalizedKey,
    ) || null
  );
}

async function main() {
  const shouldUpdate = process.argv.includes('--update');
  const modelsDevData = await fetchModelsDevData();

  let hasChanges = false;

  for (const [provider, modelsDevKey] of Object.entries(MODELS_DEV_KEYS)) {
    if (!modelsDevKey) continue;

    const providerData = modelsDevData[modelsDevKey];
    if (!providerData) continue;

    const providerFile = findProviderFile(modelsDevKey);
    if (!providerFile) continue;

    const latestModels = filterTextOnlyModels(providerData.models);
    const currentModels = getCurrentModels(providerFile);

    const added = latestModels.filter((m) => !currentModels.includes(m));
    const removed = currentModels.filter((m) => !latestModels.includes(m));

    if (added.length > 0 || removed.length > 0) {
      hasChanges = true;
      console.log(`${provider}:`);
      if (added.length > 0) console.log(`  +${added.length}`);
      if (removed.length > 0) console.log(`  -${removed.length}`);

      if (shouldUpdate) {
        updateProviderFile(providerFile, latestModels);
      }
    }
  }

  for (const {
    modelsDevKey,
    providerFile,
    arrayName,
    label,
  } of MULTI_ARRAY_PROVIDERS) {
    const providerData = modelsDevData[modelsDevKey];
    if (!providerData) continue;

    const latestModels = filterTextOnlyModels(providerData.models);
    const currentModels = getCurrentModels(providerFile, arrayName);

    const added = latestModels.filter((m) => !currentModels.includes(m));
    const removed = currentModels.filter((m) => !latestModels.includes(m));

    if (added.length > 0 || removed.length > 0) {
      hasChanges = true;
      console.log(`${label}:`);
      if (added.length > 0) console.log(`  +${added.length}`);
      if (removed.length > 0) console.log(`  -${removed.length}`);

      if (shouldUpdate) {
        updateProviderFile(providerFile, latestModels, arrayName);
      }
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
