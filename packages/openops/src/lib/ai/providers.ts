import {} from '@ai-sdk/openai-compatible';
import { amazonBedrockProvider } from './providers/amazon-bedrock';
import { anthropicProvider } from './providers/anthropic';
import { azureProvider } from './providers/azure-openai';
import { basetenProvider } from './providers/baseten-openai-compatible';
import { cerebrasProvider } from './providers/cerebras';
import { cohereProvider } from './providers/cohere';
import { deepinfraProvider } from './providers/deep-infra';
import { deepseekProvider } from './providers/deep-seek';
import { googleProvider } from './providers/google';
import { groqProvider } from './providers/groq';
import { lmntProvider } from './providers/lmnt';
import { lmstudioProvider } from './providers/lmstudio-openai-compatible';
import { mistralProvider } from './providers/mistral';
import { nimProvider } from './providers/nim-openai-compatible';
import { openAiProvider } from './providers/openai';
import { perplexityProvider } from './providers/perplexity';
import { togetherAiProvider } from './providers/together-ai';
import { xaiProvider } from './providers/xai';
export interface AiProvider {
  getModels(): string[];
}

export enum AiProviderEnum {
  AMAZON_BEDROCK = 'Amazon Bedrock',
  ANTHROPIC = 'Anthropic',
  AZURE_OPENAI = 'Azure OpenAI',
  CEREBRAS = 'Cerebras',
  COHERE = 'Cohere',
  DEEPINFRA = 'Deep Infra',
  DEEPSEEK = 'Deep Seek',
  GOOGLE = 'Google Generative AI',
  GROQ = 'Groq',
  LMNT = 'LMNT',
  MISTRAL = 'Mistral',
  OPENAI = 'OpenAI',
  PERPLEXITY = 'Perplexity',
  TOGETHER_AI = 'Together.ai',
  XAI = 'xAI Grok',
  NIM = 'Nim',
  LMSTUDIO = 'LM Studio',
  BASETEN = 'Baseten',
}

const PROVIDER_MAP: Record<AiProviderEnum, AiProvider> = {
  [AiProviderEnum.AMAZON_BEDROCK]: amazonBedrockProvider,
  [AiProviderEnum.ANTHROPIC]: anthropicProvider,
  [AiProviderEnum.AZURE_OPENAI]: azureProvider,
  [AiProviderEnum.BASETEN]: basetenProvider,
  [AiProviderEnum.CEREBRAS]: cerebrasProvider,
  [AiProviderEnum.COHERE]: cohereProvider,
  [AiProviderEnum.DEEPINFRA]: deepinfraProvider,
  [AiProviderEnum.DEEPSEEK]: deepseekProvider,
  [AiProviderEnum.GOOGLE]: googleProvider,
  [AiProviderEnum.GROQ]: groqProvider,
  [AiProviderEnum.LMNT]: lmntProvider,
  [AiProviderEnum.LMSTUDIO]: lmstudioProvider,
  [AiProviderEnum.NIM]: nimProvider,
  [AiProviderEnum.MISTRAL]: mistralProvider,
  [AiProviderEnum.OPENAI]: openAiProvider,
  [AiProviderEnum.PERPLEXITY]: perplexityProvider,
  [AiProviderEnum.TOGETHER_AI]: togetherAiProvider,
  [AiProviderEnum.XAI]: xaiProvider,
};

export function getAiProvider(aiProvider: AiProviderEnum): AiProvider {
  const providerFn = PROVIDER_MAP[aiProvider];
  if (!providerFn) {
    throw new Error(`Unsupported provider: ${aiProvider}`);
  }
  return providerFn;
}

export function getAvailableProvidersWithModels(): {
  aiProvider: AiProviderEnum;
  models: string[];
}[] {
  return Object.values(AiProviderEnum).map((aiProvider) => {
    const provider = getAiProvider(aiProvider);
    const models = provider.getModels();
    return { aiProvider, models };
  });
}
