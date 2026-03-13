import { AiProviderEnum } from '@openops/shared';
import { MODELS_DEV_KEYS } from '../../src/lib/ai/sync-models';

const EXCLUDED_PROVIDERS = [
  AiProviderEnum.AZURE_OPENAI,
  AiProviderEnum.DEEPINFRA, // Temporarily disabled until models.dev PR is merged
  AiProviderEnum.OPENAI_COMPATIBLE,
];

describe('sync-models.ts provider mapping', () => {
  it('should have all AI providers mapped in MODELS_DEV_KEYS or explicitly excluded', () => {
    const allProviders = Object.values(AiProviderEnum);
    const unmappedProviders: string[] = [];

    for (const provider of allProviders) {
      if (EXCLUDED_PROVIDERS.includes(provider)) {
        continue;
      }

      const enumKey = Object.keys(AiProviderEnum).find(
        (key) =>
          AiProviderEnum[key as keyof typeof AiProviderEnum] === provider,
      );

      if (!enumKey) {
        continue;
      }

      const isMapped = MODELS_DEV_KEYS[provider] !== undefined;

      if (!isMapped) {
        unmappedProviders.push(provider);
      }
    }

    expect(unmappedProviders).toEqual([]);
  });

  it('should exclude providers that should not be synced from models.dev', () => {
    expect(EXCLUDED_PROVIDERS).toContain(AiProviderEnum.AZURE_OPENAI);
    expect(EXCLUDED_PROVIDERS).toContain(AiProviderEnum.DEEPINFRA);
    expect(EXCLUDED_PROVIDERS).toContain(AiProviderEnum.OPENAI_COMPATIBLE);
  });
});
