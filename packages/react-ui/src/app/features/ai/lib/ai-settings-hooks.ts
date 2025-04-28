import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { AiConfig, GetProvidersResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';

export const aiSettingsHooks = {
  useAiSettingsProviders: () => {
    return useQuery<GetProvidersResponse[], Error>({
      queryKey: ['ai-settings-providers'],
      queryFn: () => aiSettingsApi.getProviderOptions(),
      staleTime: Infinity,
    });
  },
  useAiSettings: () => {
    return useQuery<AiConfig[], Error>({
      queryKey: ['ai-settings'],
      queryFn: () => aiSettingsApi.getAiSettings(),
    });
  },
};
