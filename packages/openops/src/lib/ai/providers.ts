import { LanguageModelV1 } from 'ai';
import { amazonBedrockProvider } from './providers/amazon-bedrock';
import { anthropicProvider } from './providers/anthropic';
import { azureProvider } from './providers/azure-openai';
import { cerebrasProvider } from './providers/cerebras';
import { cohereProvider } from './providers/cohere';
import { deepinfraProvider } from './providers/deep-infra';
import { deepseekProvider } from './providers/deep-seek';
import { googleProvider } from './providers/google';
import { groqProvider } from './providers/groq';
import { lmntProvider } from './providers/lmnt';
import { mistralProvider } from './providers/mistral';
import { openAiProvider } from './providers/openai';
import { openaiCompatibleProvider } from './providers/openai-compatible';
import { perplexityProvider } from './providers/perplexity';
import { togetherAiProvider } from './providers/together-ai';
import { xaiProvider } from './providers/xai';

export interface AiProvider {
  models: string[];
  createLanguageModel(params: {
    apiKey: string;
    model: string;
    baseUrl?: string;
  }): LanguageModelV1;
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
  OPENAI_COMPATIBLE = 'OpenAI Compatible',
  PERPLEXITY = 'Perplexity',
  TOGETHER_AI = 'Together.ai',
  XAI = 'xAI Grok',
}

const PROVIDER_MAP: Record<AiProviderEnum, AiProvider> = {
  [AiProviderEnum.AMAZON_BEDROCK]: amazonBedrockProvider,
  [AiProviderEnum.ANTHROPIC]: anthropicProvider,
  [AiProviderEnum.AZURE_OPENAI]: azureProvider,
  [AiProviderEnum.CEREBRAS]: cerebrasProvider,
  [AiProviderEnum.COHERE]: cohereProvider,
  [AiProviderEnum.DEEPINFRA]: deepinfraProvider,
  [AiProviderEnum.DEEPSEEK]: deepseekProvider,
  [AiProviderEnum.GOOGLE]: googleProvider,
  [AiProviderEnum.GROQ]: groqProvider,
  [AiProviderEnum.LMNT]: lmntProvider,
  [AiProviderEnum.MISTRAL]: mistralProvider,
  [AiProviderEnum.OPENAI]: openAiProvider,
  [AiProviderEnum.OPENAI_COMPATIBLE]: openaiCompatibleProvider,
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
  provider: keyof typeof AiProviderEnum;
  displayName: string;
  models: string[];
}[] {
  return Object.entries(AiProviderEnum).map(([key, displayName]) => {
    const provider = getAiProvider(
      AiProviderEnum[key as keyof typeof AiProviderEnum],
    );
    return {
      provider: key as keyof typeof AiProviderEnum,
      displayName,
      models: provider.models,
    };
  });
}
