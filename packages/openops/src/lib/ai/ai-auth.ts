import { BlockAuth, Property } from '@openops/blocks-framework';
import { AiProviderEnum, SaveAiConfigRequest } from '@openops/shared';
import { getAiProvider, validateAiProviderConfig } from './providers';

const AI_PROVIDERS_OPTIONS = Object.values(AiProviderEnum).map((p) => ({
  label: p,
  value: p,
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
      description: 'Select your AI provider',
      required: true,
      options: {
        disabled: false,
        options: AI_PROVIDERS_OPTIONS,
      },
    }),
    model: Property.DynamicProperties({
      displayName: 'Model',
      required: true,
      refreshers: ['auth'],
      props: async ({ auth }) => {
        try {
          const provider = (auth as Record<string, unknown>)?.['provider'] as
            | AiProviderEnum
            | undefined;
          const models = provider ? getAiProvider(provider).models : [];

          const options = {
            disabled: models.length === 0,
            options: models.map((m) => ({ label: m, value: m })),
          };

          return {
            model: Property.StaticDropdown({
              displayName: 'Model',
              description:
                'Choose an available model for the selected provider',
              required: true,
              options,
            }),
          };
        } catch (error) {
          return {
            model: Property.StaticDropdown({
              displayName: 'Model',
              required: true,
              options: {
                disabled: true,
                options: [],
                placeholder:
                  'Error loading models. Please try refreshing provider selection.',
                error: error instanceof Error ? error.message : String(error),
              },
            }),
          };
        }
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
  },
  validate: async ({ auth }) => {
    const providerSettings = (auth as Record<string, unknown>)?.['baseURL']
      ? { baseURL: (auth as Record<string, unknown>)['baseURL'] as string }
      : undefined;
    const payload: SaveAiConfigRequest = {
      provider: (auth as Record<string, unknown>)['provider'] as AiProviderEnum,
      model: (auth as Record<string, unknown>)['model'] as string,
      apiKey: (auth as Record<string, unknown>)['apiKey'] as string,
      providerSettings,
      modelSettings: undefined,
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
