import { AiSettingsFormSchema } from '@/app/features/ai/lib/ai-form-utils';
import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { GetProvidersResponse } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';

export const aiSettingsHooks = {
  useAiSettingsProviders: () => {
    return useQuery<GetProvidersResponse[], Error>({
      queryKey: ['ai-settings-providers'],
      queryFn: () => aiSettingsApi.getProviderOptions(),
    });
  },
  //TODO update type
  useAiSettings: () => {
    return useQuery<AiSettingsFormSchema, Error>({
      queryKey: ['ai-settings'],
      queryFn: () => aiSettingsApi.getAiSettings(),
    });
  },
};
