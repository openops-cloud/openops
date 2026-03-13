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
import fs from 'fs';
import path from 'path';

interface ModelData {
  id: string;
  name: string;
  family: string;
  modalities: {
    input: string[];
    output: string[];
  };
  cost?: {
    input: number;
    output: number;
  };
  limit?: {
    context: number;
    output: number;
  };
}

interface ProviderData {
  id: string;
  name: string;
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

function normalizeProviderKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

function getProviderFiles(): string[] {
  const providersDir = path.join(__dirname, 'providers');
  return fs
    .readdirSync(providersDir)
    .filter((file) => file.endsWith('.ts') && file !== 'index.ts')
    .map((file) => file.replace('.ts', ''));
}

function findMatchingProviderFile(modelsDevKey: string): string | null {
  const providerFiles = getProviderFiles();
  const normalizedKey = normalizeProviderKey(modelsDevKey);

  return (
    providerFiles.find(
      (file) => normalizeProviderKey(file) === normalizedKey,
    ) || null
  );
}

async function fetchModelsDevData(): Promise<ModelsDevAPI> {
  const response = await fetch('https://models.dev/api.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch models.dev API: ${response.statusText}`);
  }
  return response.json();
}

function isEmbeddingModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('embedding');
}

function filterTextOnlyModels(models: Record<string, ModelData>): string[] {
  return Object.values(models)
    .filter((model) => {
      const outputModalities = model.modalities?.output || [];
      const isTextOnly =
        outputModalities.length === 1 && outputModalities[0] === 'text';

      if (!isTextOnly) return false;

      if (isEmbeddingModel(model.id)) return false;

      return true;
    })
    .map((model) => model.id)
    .sort((a, b) => a.localeCompare(b));
}

function getProviderFilePath(providerFileName: string): string {
  return path.join(__dirname, 'providers', `${providerFileName}.ts`);
}

function getCurrentModels(providerFileName: string): string[] {
  const filePath = getProviderFilePath(providerFileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Provider file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  const modelsArrayMatch = content.match(
    /const\s+\w+Models\s*=\s*\[([\s\S]*?)\];/,
  );

  if (!modelsArrayMatch) {
    console.warn(`⚠️  Could not find models array in ${providerFileName}.ts`);
    return [];
  }

  const modelsString = modelsArrayMatch[1];
  const models = modelsString
    .split(',')
    .map((line) => {
      const match = line.match(/['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    })
    .filter((model): model is string => model !== null);

  return models.sort();
}

function updateProviderFile(
  providerFileName: string,
  newModels: string[],
): void {
  const filePath = getProviderFilePath(providerFileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Cannot update: Provider file not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  const modelsArrayMatch = content.match(
    /const\s+(\w+Models)\s*=\s*\[([\s\S]*?)\];/,
  );

  if (!modelsArrayMatch) {
    console.warn(
      `⚠️  Cannot update: Could not find models array in ${providerFileName}.ts`,
    );
    return;
  }

  const arrayName = modelsArrayMatch[1];

  const formattedModels = newModels.map((model) => `  '${model}',`).join('\n');

  const newArray = `const ${arrayName} = [\n${formattedModels}\n];`;

  const updatedContent = content.replace(
    /const\s+\w+Models\s*=\s*\[([\s\S]*?)\];/,
    newArray,
  );

  fs.writeFileSync(filePath, updatedContent, 'utf-8');

  console.log(`   ✅ Updated ${providerFileName}.ts`);
}

function compareModels(
  current: string[],
  latest: string[],
): {
  added: string[];
  removed: string[];
  unchanged: string[];
} {
  const currentSet = new Set(current);
  const latestSet = new Set(latest);

  const added = latest.filter((model) => !currentSet.has(model));
  const removed = current.filter((model) => !latestSet.has(model));
  const unchanged = current.filter((model) => latestSet.has(model));

  return { added, removed, unchanged };
}

function checkForUnmappedProviders(): string[] {
  const providerFiles = getProviderFiles();
  const mappedKeys = Object.values(MODELS_DEV_KEYS).filter(
    (key): key is string => key !== undefined,
  );

  const unmappedFiles = providerFiles.filter((file) => {
    const normalizedFile = normalizeProviderKey(file);
    return !mappedKeys.some(
      (key) => normalizeProviderKey(key) === normalizedFile,
    );
  });

  return unmappedFiles;
}

async function main() {
  const shouldUpdate = process.argv.includes('--update');

  console.log('🔄 Fetching models from models.dev...\n');

  const unmappedProviders = checkForUnmappedProviders();
  if (unmappedProviders.length > 0) {
    console.log('⚠️  Warning: Found provider files not in MODELS_DEV_KEYS:');
    unmappedProviders.forEach((file) =>
      console.log(`   - ${file}.ts (not synced)`),
    );
    console.log('   Add these to MODELS_DEV_KEYS if they should be synced.\n');
  }

  const modelsDevData = await fetchModelsDevData();

  console.log('📊 Comparing models for each provider:\n');
  console.log('='.repeat(80));

  let totalAdded = 0;
  let totalRemoved = 0;
  let hasChanges = false;

  for (const [provider, modelsDevKey] of Object.entries(MODELS_DEV_KEYS)) {
    if (!modelsDevKey) continue;

    const providerData = modelsDevData[modelsDevKey];

    if (!providerData) {
      console.log(`\n❌ ${provider}`);
      console.log(`   Provider "${modelsDevKey}" not found in models.dev`);
      continue;
    }

    const providerFile = findMatchingProviderFile(modelsDevKey);

    if (!providerFile) {
      console.log(`\n❌ ${provider}`);
      console.log(`   No matching provider file found for "${modelsDevKey}"`);
      console.log(`   Available files: ${getProviderFiles().join(', ')}`);
      continue;
    }

    const latestModels = filterTextOnlyModels(providerData.models);
    const currentModels = getCurrentModels(providerFile);

    const diff = compareModels(currentModels, latestModels);

    const hasProviderChanges = diff.added.length > 0 || diff.removed.length > 0;

    if (hasProviderChanges) {
      hasChanges = true;
    }

    const icon = hasProviderChanges ? '🔄' : '✅';
    console.log(`\n${icon} ${provider} (${modelsDevKey})`);
    console.log(`   File: ${providerFile}.ts`);
    console.log(`   Current: ${currentModels.length} models`);
    console.log(`   Latest:  ${latestModels.length} models`);

    if (diff.added.length > 0) {
      console.log(`   ➕ Added (${diff.added.length}):`);
      diff.added.forEach((model) => console.log(`      - ${model}`));
      totalAdded += diff.added.length;
    }

    if (diff.removed.length > 0) {
      console.log(`   ➖ Removed (${diff.removed.length}):`);
      diff.removed.forEach((model) => console.log(`      - ${model}`));
      totalRemoved += diff.removed.length;
    }

    if (!hasProviderChanges) {
      console.log(`   ✓ No changes`);
    }

    if (hasProviderChanges && shouldUpdate) {
      updateProviderFile(providerFile, latestModels);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 Summary:');
  console.log(`   Total models added: ${totalAdded}`);
  console.log(`   Total models removed: ${totalRemoved}`);

  if (hasChanges) {
    if (shouldUpdate) {
      console.log('\n✅ Provider files updated successfully!');
      console.log('   Please review the changes and commit.');
    } else {
      console.log('\n⚠️  Changes detected! Run with --update to apply them.');
    }
    process.exit(1);
  } else {
    console.log('\n✅ All providers are up to date!');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}
