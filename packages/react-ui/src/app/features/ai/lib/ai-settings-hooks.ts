import { QueryKeys } from '@/app/constants/query-keys';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { AiConfig, GetProvidersResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';

export const aiSettingsHooks = {
  useAiSettingsProviders: () => {
    return useQuery<GetProvidersResponse[], Error>({
      queryKey: [QueryKeys.aiSettingsProviders],
      queryFn: () => aiSettingsApi.getProviderOptions(),
      staleTime: Infinity,
    });
  },
  useAiSettings: () => {
    return useQuery<AiConfig[], Error>({
      queryKey: [QueryKeys.aiSettings],
      queryFn: () => aiSettingsApi.getAiSettings(),
    });
  },
  useHasActiveAiSettings: () => {
    const { data, isLoading, isError } = useQuery<AiConfig, Error>({
      queryKey: [QueryKeys.activeAiSettings],
      queryFn: () => aiSettingsApi.getActiveAiSettings(),
      staleTime: 1000,
      retry: false,
    });

    return {
      hasActiveAiSettings: !isError && !!data && !!data?.enabled,
      isLoading,
    };
  },
};
