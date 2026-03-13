import { AiProviderEnum } from '@openops/shared';
import fs from 'node:fs';
import path from 'node:path';

interface ModelData {
  id: string;
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
      return isTextOnly && !isEmbedding;
    })
    .map((model) => model.id)
    .sort((a, b) => a.localeCompare(b));
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
    .filter((model): model is string => model !== null)
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

  process.exit(hasChanges ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}
