import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { ApplicationError, ErrorCode } from '@openops/shared';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  if (!params.providerSettings?.['baseURL']) {
    throw new ApplicationError({
      code: ErrorCode.OPENAI_COMPATIBLE_PROVIDER_BASE_URL_REQUIRED,
      params: {
        message: 'baseURL is required for OpenAI-compatible providers',
      },
    });
  }

  const { baseURL, ...restProviderSettings } = params.providerSettings as {
    baseURL: string;
  } & Record<string, unknown>;

  return createOpenAICompatible({
    name: 'open-ai-compatible-provider',
    apiKey: params.apiKey,
    ...restProviderSettings,
    baseURL,
  })(params.model);
}

export const openaiCompatibleProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
