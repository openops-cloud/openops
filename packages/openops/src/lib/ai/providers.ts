import {
  anthropicModels,
  bedrockModels,
  cerebrasModels,
  cohereModels,
  deepInfraModels,
  deepSeekModels,
  googleModels,
  groqModels,
  lmntModels,
  mistralModels,
  openAiModels,
  perplexityModels,
  togetherAiModels,
  xaiModels,
} from './provider-models';

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
}

const PROVIDER_MAP: Record<AiProviderEnum, () => AiProvider> = {
  [AiProviderEnum.AMAZON_BEDROCK]: amazonBedrockProvider,
  [AiProviderEnum.ANTHROPIC]: anthropicProvider,
  [AiProviderEnum.AZURE_OPENAI]: azureOpenAiProvider,
  [AiProviderEnum.CEREBRAS]: cerebrasProvider,
  [AiProviderEnum.COHERE]: cohereProvider,
  [AiProviderEnum.DEEPINFRA]: deepinfraProvider,
  [AiProviderEnum.DEEPSEEK]: deepseekProvider,
  [AiProviderEnum.GOOGLE]: googleProvider,
  [AiProviderEnum.GROQ]: groqProvider,
  [AiProviderEnum.LMNT]: lmntProvider,
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
  return providerFn();
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

function openAiProvider(): AiProvider {
  return {
    getModels: () => openAiModels,
  };
}

function azureOpenAiProvider(): AiProvider {
  return {
    getModels: () => [],
  };
}

function anthropicProvider(): AiProvider {
  return {
    getModels: () => anthropicModels,
  };
}

function amazonBedrockProvider(): AiProvider {
  return {
    getModels: () => bedrockModels,
  };
}

function xaiProvider(): AiProvider {
  return {
    getModels: () => xaiModels,
  };
}

function googleProvider(): AiProvider {
  return {
    getModels: () => googleModels,
  };
}

function mistralProvider(): AiProvider {
  return {
    getModels: () => mistralModels,
  };
}

function togetherAiProvider(): AiProvider {
  return {
    getModels: () => togetherAiModels,
  };
}

function cohereProvider(): AiProvider {
  return {
    getModels: () => cohereModels,
  };
}

function deepinfraProvider(): AiProvider {
  return {
    getModels: () => deepInfraModels,
  };
}

function deepseekProvider(): AiProvider {
  return {
    getModels: () => deepSeekModels,
  };
}

function cerebrasProvider(): AiProvider {
  return {
    getModels: () => cerebrasModels,
  };
}

function groqProvider(): AiProvider {
  return {
    getModels: () => groqModels,
  };
}

function perplexityProvider(): AiProvider {
  return {
    getModels: () => perplexityModels,
  };
}

function lmntProvider(): AiProvider {
  return {
    getModels: () => lmntModels,
  };
}
