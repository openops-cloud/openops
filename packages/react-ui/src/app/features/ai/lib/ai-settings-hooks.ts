import { aiSettingsApi } from '@/app/features/ai/lib/ai-settings-api';
import { useQuery } from '@tanstack/react-query';

export const aiSettingsHooks = {
  useAiSettingsProviders: () => {
    //TODO UPDATE ANY
    return useQuery<any, Error>({
      queryKey: ['ai-settings-providers'],
      queryFn: () => aiSettingsApi.getProviderOptions(),
    });
  },
};
