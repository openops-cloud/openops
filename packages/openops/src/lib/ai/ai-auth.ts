import {
  BlockAuth,
  BlockPropValueSchema,
  Property,
} from '@openops/blocks-framework';
import { AiConfigParsed, AiProviderEnum } from '@openops/shared';
import {
  CUSTOM_MODEL_OPTION,
  getAiModelFromConnection,
} from './get-ai-model-from-connection';
import { getAiProvider, validateAiProviderConfig } from './providers';

const PROVIDER_MODEL_OPTIONS = [
  ...Object.values(AiProviderEnum).flatMap((provider) => {
    const models = getAiProvider(provider).models;
    return models.map((model) => ({
      label: `${provider} - ${model}`,
      value: model,
    }));
  }),
  CUSTOM_MODEL_OPTION,
];

const PROVIDER_OPTIONS = Object.values(AiProviderEnum).map((provider) => ({
  label: provider,
  value: provider,
}));

export const aiAuth = BlockAuth.CustomAuth({
  authProviderKey: 'AI',
  authProviderDisplayName: 'AI',
  authProviderLogoUrl: `https://static.openops.com/blocks/ai-logo.png`,
  description:
    'Configure your AI provider credentials. Supports OpenAI, Anthropic, Google, and more.',
  required: true,
  props: {
    provider: Property.StaticDropdown({
      displayName: 'Provider',
      description: 'Select provider',
      required: true,
      options: {
        disabled: PROVIDER_OPTIONS.length === 0,
        options: PROVIDER_OPTIONS,
      },
    }),
    model: Property.StaticDropdown({
      displayName: 'Model',
      description: 'Select model',
      required: true,
      options: {
        disabled: PROVIDER_MODEL_OPTIONS.length === 0,
        options: PROVIDER_MODEL_OPTIONS,
      },
    }),
    customModel: Property.ShortText({
      displayName: 'Custom model (optional)',
      description: "Define custom model if it's not in the list",
      required: false,
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
    providerSettings: Property.Json({
      displayName: 'Provider settings (optional)',
      required: false,
    }),
    modelSettings: Property.Json({
      displayName: 'Model settings (optional)',
      required: false,
    }),
  },
  validate: async ({ auth }) => {
    const authObject = auth as BlockPropValueSchema<typeof aiAuth>;

    const model = getAiModelFromConnection(
      authObject.model,
      authObject.customModel,
    );

    if (!model) {
      return { valid: false, error: 'You need to define model' };
    }

    const selectedModel = authObject.model as string;
    if (selectedModel !== CUSTOM_MODEL_OPTION.value) {
      const allowed = getAiProvider(authObject.provider).models;
      if (!allowed.includes(selectedModel)) {
        return {
          valid: false,
          error: 'selected model does not belong to provider',
        };
      }
    }

    const baseURL = authObject['baseURL'] as string | undefined;
    const providerSettings = {
      ...(authObject['providerSettings'] || {}),
      ...(baseURL ? { baseURL } : {}),
    };

    const payload: AiConfigParsed = {
      provider: authObject.provider,
      model: model,
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

export type AiAuth = BlockPropValueSchema<typeof aiAuth>;
