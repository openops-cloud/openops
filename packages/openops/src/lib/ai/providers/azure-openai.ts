import { createAzure } from '@ai-sdk/azure';
import { LanguageModel } from 'ai';
import { AiProvider } from '../providers';

function isApimUrl(url?: string) {
  return !!url && url.includes('.azure-api.net');
}

function createLanguageModel(params: {
  apiKey: string;
  model: string;
  providerSettings?: Record<string, unknown>;
}): LanguageModel {
  const isApimMode = isApimUrl(params.providerSettings?.['baseURL'] as string);
  if (isApimMode) {
    return createAzure({
      apiKey: '',
      headers: {
        'Ocp-Apim-Subscription-Key': params.apiKey,
      },
      useDeploymentBasedUrls: true,
      apiVersion: '2024-02-01',
      ...params.providerSettings,
    })(params.model);
  }

  return createAzure({
    apiKey: params.apiKey,
    ...params.providerSettings,
  })(params.model);
}

export const azureProvider: AiProvider = {
  models: [],
  createLanguageModel,
};
