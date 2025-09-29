import { BlockAuth, Property } from '@openops/blocks-framework';
import { AiProviderEnum, SaveAiConfigRequest } from '@openops/shared';
import { getAiProvider, validateAiProviderConfig } from './providers';

const PROVIDER_MODEL_OPTIONS = Object.values(AiProviderEnum).flatMap(
  (provider) => {
    const models = getAiProvider(provider).models;
    return models.map((model) => ({
      label: `${provider} - ${model}`,
      value: { provider, model },
    }));
  },
);

export const aiAuth = BlockAuth.CustomAuth({
  authProviderKey: 'AI',
  authProviderDisplayName: 'AI',
  authProviderLogoUrl: `https://static.openops.com/blocks/ai-logo.png`,
  description:
    'Configure your AI provider credentials. Supports OpenAI, Anthropic, Google, and more.',
  required: true,
  props: {
    providerModel: Property.StaticDropdown({
      displayName: 'Provider with model',
      description: 'Select provider and model',
      required: true,
      options: {
        disabled: PROVIDER_MODEL_OPTIONS.length === 0,
        options: PROVIDER_MODEL_OPTIONS,
      },
    }),
    apiKey: Property.SecretText({
      displayName: 'API Key',
      description: 'API key for the selected provider',
      required: true,
    }),
    baseURL: Property.ShortText({
      displayName: 'Base URL (optional)',
      description: 'Only for OpenAI-compatible providers',
      required: false,
    }),
    additional: Property.MarkDown({
      value: 'Additional Settings',
    }),
    providerSettings: Property.Json({
      displayName: 'Provider settings',
      description: 'Provider settings',
      required: false,
    }),
    modelSettings: Property.Json({
      displayName: 'Model settings',
      description: 'Model settings',
      required: false,
    }),
  },
  validate: async ({ auth }) => {
    const authObject = auth as Record<string, unknown>;
    const { provider, model } = authObject['providerModel'] as {
      provider: AiProviderEnum;
      model: string;
    };
    const baseURL = authObject['baseURL'] as string | undefined;
    const providerSettings = {
      ...(authObject['providerSettings'] || {}),
      ...(baseURL ? { baseURL } : {}),
    };

    const payload: SaveAiConfigRequest = {
      provider: provider as AiProviderEnum,
      model: model as string,
      apiKey: authObject['apiKey'] as string,
      providerSettings:
        Object.keys(providerSettings).length > 0 ? providerSettings : undefined,
      modelSettings: authObject['modelSettings'] as
        | Record<string, unknown>
        | undefined,
    };
    const result = await validateAiProviderConfig(payload);
    if (result.valid) {
      return { valid: true };
    }
    const err: unknown = (result as unknown as { error?: unknown })?.error;
    const message =
      (err as { errorMessage?: string })?.errorMessage ||
      (err as { message?: string })?.message ||
      'Invalid AI configuration';
    return { valid: false, error: message };
  },
});
