import { SharedSystemProp, system } from '@openops/server-shared';
import {
  AiConfigParsed,
  AiProviderEnum,
  ApplicationError,
  ApplicationErrorParams,
  GetProvidersResponse,
} from '@openops/shared';
import { AISDKError, generateText, LanguageModel } from 'ai';
import { anthropicProvider } from './providers/anthropic';
import { azureProvider } from './providers/azure-openai';
import { cerebrasProvider } from './providers/cerebras';
import { cohereProvider } from './providers/cohere';
import { deepinfraProvider } from './providers/deep-infra';
import { deepseekProvider } from './providers/deep-seek';
import { googleProvider } from './providers/google';
import { googleVertexProvider } from './providers/google-vertex';
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
    providerSettings?: Record<string, unknown>;
  }): LanguageModel;
}

const PROVIDER_MAP: Record<AiProviderEnum, AiProvider> = {
  [AiProviderEnum.ANTHROPIC]: anthropicProvider,
  [AiProviderEnum.AZURE_OPENAI]: azureProvider,
  [AiProviderEnum.CEREBRAS]: cerebrasProvider,
  [AiProviderEnum.COHERE]: cohereProvider,
  [AiProviderEnum.DEEPINFRA]: deepinfraProvider,
  [AiProviderEnum.DEEPSEEK]: deepseekProvider,
  [AiProviderEnum.GOOGLE]: googleProvider,
  [AiProviderEnum.GOOGLE_VERTEX]: googleVertexProvider,
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
}): Promise<LanguageModel> => {
  const aiProvider = getAiProvider(aiConfig.provider);
  const sanitizedSettings = sanitizeProviderSettings(aiConfig.providerSettings);

  return aiProvider.createLanguageModel({
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    providerSettings: {
      ...sanitizedSettings,
    },
  });
};

export const validateAiProviderConfig = async (
  config: AiConfigParsed,
): Promise<{
  valid: boolean;
  error?: { errorMessage: string; errorName: string } | ApplicationErrorParams;
}> => {
  try {
    const languageModel = await getAiProviderLanguageModel({
      apiKey: config.apiKey,
      model: config.model,
      provider: config.provider,
      providerSettings: config.providerSettings,
    });

    await generateText({
      model: languageModel,
      prompt: 'Hi',
      ...config.modelSettings,
    });
  } catch (error) {
    if (AISDKError.isInstance(error)) {
      return invalidConfigError(
        error.name,
        error.message.replace(config.apiKey, '**REDACTED**'),
      );
    }

    if (error instanceof ApplicationError) {
      return {
        valid: false,
        error: error.error,
      };
    }

    return invalidConfigError(
      error instanceof Error ? error.name : 'UnknownError',
      error instanceof Error ? error.message : 'Unknown error occurred',
    );
  }

  return { valid: true };
};

export const isLLMTelemetryEnabled = () =>
  !!system.get(SharedSystemProp.LANGFUSE_SECRET_KEY) &&
  !!system.get(SharedSystemProp.LANGFUSE_PUBLIC_KEY);

export const getLLMTelemetryConfig = () => {
  return {
    secretKey: system.get(SharedSystemProp.LANGFUSE_SECRET_KEY),
    publicKey: system.get(SharedSystemProp.LANGFUSE_PUBLIC_KEY),
    baseUrl: system.get(SharedSystemProp.LANGFUSE_HOST),
    environment: system.get(SharedSystemProp.ENVIRONMENT_NAME),
  };
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

function sanitizeProviderSettings(
  settings: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!settings) return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settings)) {
    if (
      value !== null &&
      value !== undefined &&
      !(typeof value === 'string' && value.trim() === '')
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
