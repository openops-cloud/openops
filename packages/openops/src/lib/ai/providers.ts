import {
  AiProviderEnum,
  GetProvidersResponse,
  SaveAiConfigRequest,
} from '@openops/shared';
import { AISDKError, generateText, LanguageModelV1 } from 'ai';
import { anthropicProvider } from './providers/anthropic';
import { azureProvider } from './providers/azure-openai';
import { cerebrasProvider } from './providers/cerebras';
import { cohereProvider } from './providers/cohere';
import { deepinfraProvider } from './providers/deep-infra';
import { deepseekProvider } from './providers/deep-seek';
import { googleProvider } from './providers/google';
import { groqProvider } from './providers/groq';
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

const PROVIDER_MAP: Record<AiProviderEnum, AiProvider> = {
  [AiProviderEnum.ANTHROPIC]: anthropicProvider,
  [AiProviderEnum.AZURE_OPENAI]: azureProvider,
  [AiProviderEnum.CEREBRAS]: cerebrasProvider,
  [AiProviderEnum.COHERE]: cohereProvider,
  [AiProviderEnum.DEEPINFRA]: deepinfraProvider,
  [AiProviderEnum.DEEPSEEK]: deepseekProvider,
  [AiProviderEnum.GOOGLE]: googleProvider,
  [AiProviderEnum.GROQ]: groqProvider,
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

export function getAvailableProvidersWithModels(): GetProvidersResponse[] {
  return Object.entries(AiProviderEnum).map(([key, value]) => {
    const provider = getAiProvider(
      AiProviderEnum[key as keyof typeof AiProviderEnum],
    );
    return {
      provider: value,
      models: provider.models,
    };
  });
}

export const getAiProviderLanguageModel = async (aiConfig: {
  provider: AiProviderEnum;
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown> | null;
}): Promise<LanguageModelV1> => {
  const aiProvider = getAiProvider(aiConfig.provider);

  return aiProvider.createLanguageModel({
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    baseUrl: sanitizeBaseUrl(aiConfig.providerSettings),
  });
};

export const validateAiProviderConfig = async (
  config: SaveAiConfigRequest,
): Promise<{
  valid: boolean;
  error?: { errorMessage: string; errorName: string };
}> => {
  const languageModel = await getAiProviderLanguageModel({
    apiKey: config.apiKey,
    model: config.model,
    provider: config.provider,
    providerSettings: config.providerSettings,
  });

  try {
    await generateText({
      model: languageModel,
      prompt: '',
      ...config.modelSettings,
    });
  } catch (error) {
    if (AISDKError.isInstance(error)) {
      return invalidConfigError(
        error.name,
        error.message.replace(config.apiKey, '**REDACTED**'),
      );
    }

    return invalidConfigError(
      error instanceof Error ? error.name : 'UnknownError',
      error instanceof Error ? error.message : 'Unknown error occurred',
    );
  }

  return { valid: true };
};

const sanitizeBaseUrl = (
  providerSettings?: Record<string, unknown> | null,
): string | undefined => {
  const rawBaseUrl = providerSettings?.['baseUrl'];
  return typeof rawBaseUrl === 'string' && rawBaseUrl.trim() !== ''
    ? rawBaseUrl
    : undefined;
};

const invalidConfigError = (
  errorName: string,
  errorMessage: string,
): {
  valid: boolean;
  error: { errorMessage: string; errorName: string };
} => {
  return {
    valid: false,
    error: { errorName, errorMessage },
  };
};
