import { QueryKeys } from '@/app/constants/query-keys';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { toast } from '@openops/components/ui';
import { AiConfig, GetProvidersResponse } from '@openops/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { t } from 'i18next';

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
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
      hasActiveAiSettings: !isError && !!data && !!data?.enabled,
      isLoading,
    };
  },
  useActiveAiSettings: () => {
    return useQuery<AiConfig, Error>({
      queryKey: [QueryKeys.activeAiSettings],
      queryFn: () => aiSettingsApi.getActiveAiSettings(),
      staleTime: 1000,
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000, // 5 minutes
    });
  },
  useProviderModels: (providerName: string | null | undefined) => {
    return useQuery<GetProvidersResponse | null, Error>({
      queryKey: [QueryKeys.aiProviderModels, providerName],
      queryFn: () => {
        if (!providerName) {
          return null;
        }
        return aiSettingsApi.getProviderModels(providerName);
      },
      enabled: !!providerName,
      staleTime: Infinity,
    });
  },
  useSaveAiSettings: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (payload: any) => aiSettingsApi.saveAiSettings(payload),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.activeAiSettings],
        });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.aiSettings] });
      },
      onError: (error: AxiosError) => {
        const message =
          error.status === 400
            ? (error.response?.data as { errorMessage: string })?.errorMessage
            : error.message;
        toast({
          title: t('Error'),
          variant: 'destructive',
          description: message,
          duration: 3000,
        });
      },
    });
  },
};
